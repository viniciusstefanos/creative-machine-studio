import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";
import { corsHeaders } from "../_shared/cors.ts";
import { extractHtml } from "../_shared/extract-html.ts";
import { validateAndFixHtml } from "../_shared/validate-html.ts";
import { extractBase64FromResponse } from "../_shared/generate-image.ts";
import { resolveBrandIdentity } from "../_shared/build-brief-context.ts";

/** Build enriched context for image generation from DB */
async function buildImageContext(supabase: any, assetId: string, renderId: string) {
  const { data: asset } = await supabase.from("assets")
    .select("activation_id, copy_id, template_id, render_config")
    .eq("id", assetId).single();
  if (!asset) return { brandContext: "", copyContext: "", templatePrompt: "", currentImageUrl: "", templateName: "" };

  const [briefRes, copyRes, templateRes, renderRes, briefFilesRes] = await Promise.all([
    supabase.from("briefs").select("consolidated_context, brand_colors, visual_style, tone_of_voice, typography")
      .eq("activation_id", asset.activation_id).single(),
    asset.copy_id
      ? supabase.from("copies").select("hook, body, cta, channel").eq("id", asset.copy_id).single()
      : Promise.resolve({ data: null }),
    asset.template_id
      ? supabase.from("asset_templates").select("name, image_prompt_template, category").eq("id", asset.template_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("asset_template_renders").select("image_url").eq("id", renderId).single(),
    supabase.from("brief_files").select("extracted_fields").eq("activation_id", asset.activation_id).not("extracted_fields", "is", null),
  ]);

  const brief = briefRes.data;
  const consolidated = brief?.consolidated_context || {};
  const identity = resolveBrandIdentity(brief, briefFilesRes.data || [], consolidated);

  let brandContext = "";
  const cc = consolidated;
  if (cc && typeof cc === "object") {
    const parts: string[] = [];
    if (cc.brand_name) parts.push(`Marca: ${cc.brand_name}`);
    if (cc.brand_positioning) parts.push(`Posicionamento: ${cc.brand_positioning}`);
    if (identity.visualStyle) parts.push(`Estilo visual: ${identity.visualStyle}`);
    if (identity.brandColors) parts.push(`Cores: ${identity.brandColors}`);
    else if (identity.briefFileColors.length) parts.push(`Cores: ${identity.briefFileColors.join(", ")}`);
    if (cc.target_audience?.demographics) parts.push(`Público: ${cc.target_audience.demographics}`);
    if (cc.tone_of_voice?.personality) parts.push(`Tom: ${cc.tone_of_voice.personality}`);
    brandContext = parts.join("\n");
  }
  if (!brandContext) {
    const fallback: string[] = [];
    if (identity.brandColors) fallback.push(`Cores: ${identity.brandColors}`);
    if (identity.visualStyle) fallback.push(`Estilo: ${identity.visualStyle}`);
    if (brief?.tone_of_voice) fallback.push(`Tom: ${brief.tone_of_voice}`);
    brandContext = fallback.join("\n");
  }

  let copyContext = "";
  if (copyRes.data) {
    const c = copyRes.data;
    const cParts: string[] = [];
    if (c.hook) cParts.push(`Hook: ${c.hook}`);
    if (c.body) cParts.push(`Body: ${c.body}`);
    if (c.cta) cParts.push(`CTA: ${c.cta}`);
    copyContext = cParts.join("\n");
  }

  return {
    brandContext,
    copyContext,
    templatePrompt: templateRes.data?.image_prompt_template || "",
    currentImageUrl: renderRes.data?.image_url || "",
    templateName: templateRes.data?.name || "",
  };
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
      await supabase.from("asset_template_renders").update({ html_content, png_url: null }).eq("id", render_id);
      if (asset_id) {
        const { data: renders } = await supabase.from("asset_template_renders").select("id").eq("asset_id", asset_id);
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
      const { data: render } = await supabase.from("asset_template_renders").select("html_content").eq("id", render_id).single();
      if (!render?.html_content) {
        return new Response(JSON.stringify({ error: "No HTML to refine" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const instruction = html_content || "Melhore o design";
      const systemPrompt = `Você é um designer visual expert. Receba um HTML de peça para Instagram e uma instrução de edição. Aplique APENAS a edição solicitada, mantendo o restante intacto. Retorne SOMENTE o HTML final, sem markdown, sem explicação.`;
      const userPrompt = `HTML atual:\n\`\`\`html\n${render.html_content}\n\`\`\`\n\nInstrução de edição: ${instruction}`;

      const useClaude2 = !!use_claude;
      let result: string;

      if (useClaude2 && anthropicKey) {
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

      const cleanHtmlRaw = extractHtml(result);
      // Fetch template dimensions for validation
      let valWidth = 1080, valHeight = 1350, genType = "html_only";
      if (asset_id) {
        const { data: assetData } = await supabase.from("assets").select("template_id").eq("id", asset_id).single();
        if (assetData?.template_id) {
          const { data: tpl } = await supabase.from("asset_templates").select("width_px, height_px, generation_type").eq("id", assetData.template_id).single();
          if (tpl) { valWidth = tpl.width_px; valHeight = tpl.height_px; genType = tpl.generation_type; }
        }
      }
      const v = validateAndFixHtml(cleanHtmlRaw, { width: valWidth, height: valHeight, generationType: genType });
      const cleanHtml = v.html;
      await supabase.from("asset_template_renders").update({ html_content: cleanHtml, png_url: null, generation_warnings: v.warnings.length ? v.warnings : null }).eq("id", render_id);
      if (asset_id) {
        const { data: renders } = await supabase.from("asset_template_renders").select("id").eq("asset_id", asset_id);
        if (renders && renders.length === 1) {
          await supabase.from("assets").update({ html_content: cleanHtml }).eq("id", asset_id);
        }
      }
      return new Response(JSON.stringify({ success: true, html_content: cleanHtml }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: regenerate_image ──────────────────────────────
    if (action === "regenerate_image") {
      if (!image_prompt) {
        return new Response(JSON.stringify({ error: "image_prompt required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ctx = asset_id
        ? await buildImageContext(supabase, asset_id, render_id)
        : { brandContext: "", copyContext: "", templatePrompt: "", currentImageUrl: "", templateName: "" };

      const promptParts: string[] = [];
      if (ctx.brandContext) promptParts.push(`## Contexto da marca\n${ctx.brandContext}`);
      if (ctx.copyContext) promptParts.push(`## Peça atual\n${ctx.copyContext}`);
      if (ctx.templateName) promptParts.push(`Template: ${ctx.templateName}`);
      promptParts.push(`## Instrução do usuário\n${image_prompt}`);
      promptParts.push(`\nGere uma imagem de alta qualidade seguindo a instrução acima, mantendo total coerência com a identidade visual da marca.`);
      const enrichedPrompt = promptParts.join("\n\n");

      const shouldEdit = edit_current && ctx.currentImageUrl;

      const callImageApi = async (): Promise<any> => {
        const messages: any[] = [];
        if (shouldEdit) {
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
          if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (!base64Data) {
        return new Response(JSON.stringify({ error: `Falha na geração de imagem após 2 tentativas: ${lastError}` }), {
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
        const { data: renders } = await supabase.from("asset_template_renders").select("id").eq("asset_id", asset_id);
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
