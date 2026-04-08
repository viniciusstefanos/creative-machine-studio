import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";

/** Strip code fences and any markdown/explanation text around HTML */
function extractHtml(raw: string): string {
  let s = raw.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();
  const startMatch = s.match(/(<(!DOCTYPE|html|head|body|div|section|link|style|meta)\b)/i);
  const endMatch = s.match(/.*(\/\s*(html|body|div|section|style)>)/is);
  if (startMatch?.index !== undefined && endMatch) {
    const endIdx = s.lastIndexOf(endMatch[2].startsWith("/") ? endMatch[2] : "</" + endMatch[2]);
    const lastClose = s.indexOf(">", endIdx) + 1;
    if (lastClose > startMatch.index) {
      s = s.substring(startMatch.index, lastClose);
    }
  }
  return s.trim();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Build enriched context for image generation from DB */
async function buildImageContext(supabase: any, assetId: string, renderId: string) {
  // Get asset info
  const { data: asset } = await supabase.from("assets")
    .select("activation_id, copy_id, template_id, render_config")
    .eq("id", assetId).single();
  if (!asset) return { brandContext: "", copyContext: "", templatePrompt: "", currentImageUrl: "" };

  // Parallel fetches
  const [briefRes, copyRes, templateRes, renderRes] = await Promise.all([
    supabase.from("briefs").select("consolidated_context, brand_colors, visual_style, tone_of_voice")
      .eq("activation_id", asset.activation_id).single(),
    asset.copy_id
      ? supabase.from("copies").select("hook, body, cta, channel").eq("id", asset.copy_id).single()
      : Promise.resolve({ data: null }),
    asset.template_id
      ? supabase.from("asset_templates").select("name, image_prompt_template, category").eq("id", asset.template_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("asset_template_renders").select("image_url").eq("id", renderId).single(),
  ]);

  // Build brand context from consolidated_context
  let brandContext = "";
  const cc = briefRes.data?.consolidated_context;
  if (cc && typeof cc === "object") {
    const parts: string[] = [];
    if (cc.brand_name) parts.push(`Marca: ${cc.brand_name}`);
    if (cc.brand_positioning) parts.push(`Posicionamento: ${cc.brand_positioning}`);
    if (cc.visual_guidelines) parts.push(`Estilo visual: ${cc.visual_guidelines}`);
    if (cc.brand_colors) parts.push(`Cores: ${cc.brand_colors}`);
    if (cc.target_audience?.demographics) parts.push(`Público: ${cc.target_audience.demographics}`);
    if (cc.tone_of_voice?.personality) parts.push(`Tom: ${cc.tone_of_voice.personality}`);
    brandContext = parts.join("\n");
  }
  if (!brandContext) {
    const fallback: string[] = [];
    if (briefRes.data?.brand_colors) fallback.push(`Cores: ${briefRes.data.brand_colors}`);
    if (briefRes.data?.visual_style) fallback.push(`Estilo: ${briefRes.data.visual_style}`);
    if (briefRes.data?.tone_of_voice) fallback.push(`Tom: ${briefRes.data.tone_of_voice}`);
    brandContext = fallback.join("\n");
  }

  // Copy context
  let copyContext = "";
  if (copyRes.data) {
    const c = copyRes.data;
    const cParts: string[] = [];
    if (c.hook) cParts.push(`Hook: ${c.hook}`);
    if (c.body) cParts.push(`Body: ${c.body}`);
    if (c.cta) cParts.push(`CTA: ${c.cta}`);
    copyContext = cParts.join("\n");
  }

  const templatePrompt = templateRes.data?.image_prompt_template || "";
  const currentImageUrl = renderRes.data?.image_url || "";

  return { brandContext, copyContext, templatePrompt, currentImageUrl, templateName: templateRes.data?.name || "" };
}

/** Extract base64 image data from AI response */
function extractBase64FromResponse(data: any): string | null {
  const choice = data.choices?.[0];
  if (!choice) return null;

  // Check images array first (Lovable gateway format)
  const imgUrl = choice.message?.images?.[0]?.image_url?.url;
  if (imgUrl) return imgUrl.includes(",") ? imgUrl.split(",")[1] : imgUrl;

  // Check content array
  if (Array.isArray(choice.message?.content)) {
    for (const part of choice.message.content) {
      if (part.type === "image_url" && part.image_url?.url) {
        const url = part.image_url.url;
        return url.includes(",") ? url.split(",")[1] : url;
      }
      if (part.type === "image" && part.data) return part.data;
    }
  }

  // Check parts (Gemini native)
  if (Array.isArray(choice.message?.parts)) {
    for (const p of choice.message.parts) {
      if (p.inline_data?.data) return p.inline_data.data;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { render_id, action, html_content, image_prompt, use_claude, asset_id, edit_current } = body;

  if (!render_id || !action) {
    return new Response(JSON.stringify({ error: "render_id and action required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ─── ACTION: save_html ─────────────────────────────────────
    if (action === "save_html") {
      if (!html_content) {
        return new Response(JSON.stringify({ error: "html_content required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("asset_template_renders").update({
        html_content, png_url: null,
      }).eq("id", render_id);

      if (asset_id) {
        const { data: renders } = await supabase.from("asset_template_renders")
          .select("id").eq("asset_id", asset_id);
        if (renders && renders.length === 1) {
          await supabase.from("assets").update({ html_content }).eq("id", asset_id);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: refine_html ───────────────────────────────────
    if (action === "refine_html") {
      const { data: render } = await supabase.from("asset_template_renders")
        .select("html_content").eq("id", render_id).single();
      if (!render?.html_content) {
        return new Response(JSON.stringify({ error: "No HTML to refine" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const instruction = html_content || "Melhore o design";
      const systemPrompt = `Você é um designer visual expert. Receba um HTML de peça para Instagram e uma instrução de edição. Aplique APENAS a edição solicitada, mantendo o restante intacto. Retorne SOMENTE o HTML final, sem markdown, sem explicação, ZERO texto antes ou depois do HTML.`;
      const userPrompt = `HTML atual:\n\`\`\`html\n${render.html_content}\n\`\`\`\n\nInstrução de edição: ${instruction}`;

      const useClaude = !!use_claude;
      let result: string;

      if (useClaude && anthropicKey) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", max_tokens: 8192,
            system: systemPrompt, messages: [{ role: "user", content: userPrompt }],
          }),
        });
        if (!res.ok) throw new Error("ai_failed");
        const data = await res.json();
        result = data.content?.[0]?.text || "";
      } else {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          }),
        });
        if (!res.ok) throw new Error("ai_failed");
        const data = await res.json();
        result = data.choices?.[0]?.message?.content || "";
      }

      const cleanHtml = extractHtml(result);

      await supabase.from("asset_template_renders").update({
        html_content: cleanHtml, png_url: null,
      }).eq("id", render_id);

      if (asset_id) {
        const { data: renders } = await supabase.from("asset_template_renders")
          .select("id").eq("asset_id", asset_id);
        if (renders && renders.length === 1) {
          await supabase.from("assets").update({ html_content: cleanHtml }).eq("id", asset_id);
        }
      }

      return new Response(JSON.stringify({ success: true, html_content: cleanHtml }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: regenerate_image — enriched with context ──────
    if (action === "regenerate_image") {
      if (!image_prompt) {
        return new Response(JSON.stringify({ error: "image_prompt required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch enriched context from DB
      const ctx = asset_id
        ? await buildImageContext(supabase, asset_id, render_id)
        : { brandContext: "", copyContext: "", templatePrompt: "", currentImageUrl: "", templateName: "" };

      // Build enriched prompt
      const promptParts: string[] = [];
      if (ctx.brandContext) promptParts.push(`## Contexto da marca\n${ctx.brandContext}`);
      if (ctx.copyContext) promptParts.push(`## Peça atual\n${ctx.copyContext}`);
      if (ctx.templateName) promptParts.push(`Template: ${ctx.templateName}`);
      promptParts.push(`## Instrução do usuário\n${image_prompt}`);
      promptParts.push(`\nGere uma imagem de alta qualidade seguindo a instrução acima, mantendo total coerência com a identidade visual da marca.`);
      const enrichedPrompt = promptParts.join("\n\n");

      // Determine if we should edit the current image or generate from scratch
      const shouldEdit = edit_current && ctx.currentImageUrl;

      const callImageApi = async (): Promise<any> => {
        const messages: any[] = [];

        if (shouldEdit) {
          // Image editing: send current image as reference
          messages.push({
            role: "user",
            content: [
              { type: "text", text: enrichedPrompt },
              { type: "image_url", image_url: { url: ctx.currentImageUrl } },
            ],
          });
        } else {
          messages.push({ role: "user", content: enrichedPrompt });
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages,
            modalities: ["image", "text"],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`image_gen_failed: ${res.status} ${errText.substring(0, 200)}`);
        }
        return await res.json();
      };

      // Try with retry (1x)
      let base64Data: string | null = null;
      let lastError = "";

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const data = await callImageApi();
          base64Data = extractBase64FromResponse(data);
          if (base64Data) break;
          lastError = "Modelo não retornou imagem na resposta";
        } catch (e: any) {
          lastError = e.message || "Erro desconhecido";
          if (attempt === 0) {
            // Wait before retry
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }

      if (!base64Data) {
        return new Response(JSON.stringify({
          error: `Falha na geração de imagem após 2 tentativas: ${lastError}`,
        }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imageBytes = decodeBase64(base64Data);
      const effectiveAssetId = asset_id || render_id;
      const filePath = `generated/${effectiveAssetId}/${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage
        .from("assets")
        .upload(filePath, imageBytes, { contentType: "image/png", upsert: true });
      if (uploadErr) throw new Error("upload_failed");
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(filePath);
      const newImageUrl = urlData.publicUrl;

      await supabase.from("asset_template_renders").update({ image_url: newImageUrl }).eq("id", render_id);

      if (asset_id) {
        const { data: renders } = await supabase.from("asset_template_renders")
          .select("id").eq("asset_id", asset_id);
        if (renders && renders.length === 1) {
          await supabase.from("assets").update({ image_url: newImageUrl }).eq("id", asset_id);
        }
      }

      return new Response(JSON.stringify({ success: true, image_url: newImageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("edit-asset-render error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
