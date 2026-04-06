import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Claude helper (text/HTML) ───────────────────────────────
async function callClaude(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const status = res.status;
    const errText = await res.text();
    console.error("Claude error:", status, errText);
    throw new Error(status === 429 ? "rate_limit" : status === 402 ? "credits" : "ai_failed");
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ─── Lovable AI helper (text/HTML via Gemini) ────────────────
async function callLovableAI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const status = res.status;
    const errText = await res.text();
    console.error("Lovable AI error:", status, errText);
    throw new Error(status === 429 ? "rate_limit" : status === 402 ? "credits" : "ai_failed");
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Unified text generation call ────────────────────────────
async function callTextAI(systemPrompt: string, userPrompt: string, useClaude: boolean, anthropicKey: string, lovableKey: string): Promise<string> {
  if (useClaude) {
    return callClaude(systemPrompt, userPrompt, anthropicKey);
  }
  return callLovableAI(systemPrompt, userPrompt, lovableKey);
}

// ─── Generate optimized image prompt ─────────────────────────
async function generateImagePrompt(template: string, context: Record<string, any>, useClaude: boolean, anthropicKey: string, lovableKey: string): Promise<string> {
  const filled = fillTemplate(template, context);
  const res = await callTextAI(
    `Você é um especialista em prompts para geração de imagem. Receba um rascunho de prompt e melhore-o para gerar a melhor imagem possível. Retorne APENAS o prompt otimizado em inglês, sem explicação.`,
    `Rascunho de prompt: "${filled}"\n\nOtimize este prompt para geração de imagem:`,
    useClaude, anthropicKey, lovableKey,
  );
  return res.trim() || filled;
}

// ─── Nano Banana (image generation via Lovable AI) ───────────
async function generateImage(
  prompt: string,
  lovableKey: string,
  supabase: any,
  assetId: string,
): Promise<string | null> {
  try {
    console.log("Image gen: sending request...");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: `Generate an image: ${prompt}` }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Image gen failed:", res.status, errText);
      return null;
    }
    const data = await res.json();
    console.log("Image gen response keys:", JSON.stringify(Object.keys(data)));
    const choice = data.choices?.[0];
    if (choice) {
      console.log("Choice message keys:", JSON.stringify(Object.keys(choice.message || {})));
    }

    // Try multiple response formats
    let base64Data: string | null = null;

    // Format 1: images array with image_url.url
    const imgUrl = choice?.message?.images?.[0]?.image_url?.url;
    if (imgUrl) {
      base64Data = imgUrl.includes(",") ? imgUrl.split(",")[1] : imgUrl;
    }

    // Format 2: content array with image_url type
    if (!base64Data && Array.isArray(choice?.message?.content)) {
      for (const part of choice.message.content) {
        if (part.type === "image_url" && part.image_url?.url) {
          const url = part.image_url.url;
          base64Data = url.includes(",") ? url.split(",")[1] : url;
          break;
        }
        if (part.type === "image" && part.data) {
          base64Data = part.data;
          break;
        }
      }
    }

    // Format 3: inline_data in parts
    if (!base64Data && Array.isArray(choice?.message?.parts)) {
      for (const part of choice.message.parts) {
        if (part.inline_data?.data) {
          base64Data = part.inline_data.data;
          break;
        }
      }
    }

    if (!base64Data) {
      console.error("No image data found in response. Full structure:", JSON.stringify(data).substring(0, 1000));
      return null;
    }

    const imageBytes = decode(base64Data);
    const filePath = `generated/${assetId}/${Date.now()}.png`;
    const { error: uploadErr } = await supabase.storage
      .from("assets")
      .upload(filePath, imageBytes, { contentType: "image/png", upsert: true });
    if (uploadErr) { console.error("Upload error:", uploadErr); return null; }
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(filePath);
    console.log("Image uploaded:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (e) {
    console.error("Image gen error:", e);
    return null;
  }
}

function fillTemplate(tpl: string, ctx: Record<string, any>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] || "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { asset_id, template_id, copy_id, activation_id, render_config } = body;
  if (!asset_id || !template_id || !copy_id || !activation_id) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Clean up previous renders for re-generation
    await supabase.from("asset_template_renders").delete().eq("asset_id", asset_id);
    const [templateRes, copyRes, briefRes] = await Promise.all([
      supabase.from("asset_templates").select("*").eq("id", template_id).single(),
      supabase.from("copies").select("*").eq("id", copy_id).single(),
      supabase.from("briefs").select("*").eq("activation_id", activation_id).maybeSingle(),
    ]);

    const template = templateRes.data;
    const copy = copyRes.data;
    const brief = briefRes.data;

    if (!template || !copy) {
      await supabase.from("assets").update({ status: "rejected", feedback: "Template ou copy não encontrado." }).eq("id", asset_id);
      return new Response(JSON.stringify({ error: "Template or copy not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = render_config || {};
    const context = {
      hook: copy.hook || "",
      body: copy.body || "",
      cta: copy.cta || "",
      full_copy: copy.full_copy || `${copy.hook || ""}\n${copy.body || ""}\n${copy.cta || ""}`,
      objectives: brief?.objectives || "",
      target_audience: brief?.target_audience || "",
      tone_of_voice: brief?.tone_of_voice || "",
      ...config,
    };

    const saveRender = async (slideIndex: number, fields: Record<string, any>) => {
      await supabase.from("asset_template_renders").insert({
        asset_id, slide_index: slideIndex, status: "ready", ...fields,
      });
    };

    const splitCopyIntoSlides = (minSlides: number): string[] => {
      const parts: string[] = [];
      if (copy.hook) parts.push(copy.hook);
      if (copy.body) {
        const sentences = copy.body.split(/[.!?\n]+/).map((s: string) => s.trim()).filter(Boolean);
        parts.push(...sentences);
      }
      if (copy.cta) parts.push(copy.cta);
      while (parts.length < minSlides) parts.push(copy.body || copy.hook || "");
      return parts;
    };

    // ─── Branch by generation_type ────────────────────────────
    if (template.generation_type === "html_only") {
      const carouselInstruction = template.category === "carousel"
        ? `\n\nDivida o copy em ${template.slides_count_min} a ${template.slides_count_max} slides.\nSlide 1: sempre o GANCHO.\nSlides do meio: pontos do CORPO — um por slide.\nSlide final: sempre o CTA.\nRetorne APENAS um array JSON: [{"slide_index": 0, "html": "..."}]. Zero markdown.`
        : "";

      const userPrompt = `Copy:\n- Hook: ${context.hook}\n- Body: ${context.body}\n- CTA: ${context.cta}\n\nDimensões: ${template.width_px}x${template.height_px}px\nConfig: ${JSON.stringify(config)}`;

      const rawContent = await callClaude(
        (template.system_prompt || "") + carouselInstruction,
        userPrompt,
        anthropicKey,
      );

      if (template.category === "carousel") {
        const cleaned = rawContent.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
        let slides: Array<{ slide_index: number; html: string }>;
        try { slides = JSON.parse(cleaned); } catch {
          slides = [{ slide_index: 0, html: cleaned }];
        }
        for (const slide of slides) {
          await saveRender(slide.slide_index, { html_content: slide.html });
        }
      } else {
        const html = rawContent.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();
        await saveRender(0, { html_content: html });
        await supabase.from("assets").update({ html_content: html }).eq("id", asset_id);
      }

    } else if (template.generation_type === "image_only") {
      const slideParts = splitCopyIntoSlides(template.slides_count_min || 1);
      const maxSlides = Math.min(slideParts.length, template.slides_count_max || 5);

      for (let i = 0; i < maxSlides; i++) {
        // Claude optimizes the prompt, Nano Banana generates the image
        const optimizedPrompt = await generateImagePrompt(
          template.image_prompt_template || "",
          { ...context, slide_content: slideParts[i] },
          anthropicKey,
        );
        const imageUrl = await generateImage(optimizedPrompt, lovableKey, supabase, asset_id);
        await saveRender(i, { image_url: imageUrl });
        if (maxSlides === 1 && imageUrl) {
          await supabase.from("assets").update({ image_url: imageUrl }).eq("id", asset_id);
        }
      }

    } else if (template.generation_type === "html_and_image") {
      // Claude optimizes image prompt, Nano Banana generates
      const optimizedPrompt = await generateImagePrompt(
        template.image_prompt_template || "",
        context,
        anthropicKey,
      );
      const bgImageUrl = await generateImage(optimizedPrompt, lovableKey, supabase, asset_id);

      // Claude generates HTML overlay
      const overlayPrompt = `Copy:\n- Hook: ${context.hook}\n- Body: ${context.body}\n- CTA: ${context.cta}\n\nDimensões: ${template.width_px}x${template.height_px}px\nImagem de fundo: ${bgImageUrl || "não disponível"}\nConfig: ${JSON.stringify(config)}`;
      const rawHtml = await callClaude(template.system_prompt || "", overlayPrompt, anthropicKey);
      const html = rawHtml.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();

      await saveRender(0, { html_content: html, image_url: bgImageUrl });
      await supabase.from("assets").update({ html_content: html, image_url: bgImageUrl }).eq("id", asset_id);
    }

    await supabase.from("assets").update({ status: "review" }).eq("id", asset_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-asset-from-template error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const feedbackMsg = msg === "rate_limit" ? "Limite de requisições. Tente novamente." :
      msg === "credits" ? "Créditos insuficientes." : "Erro na geração. Tente novamente.";

    await supabase.from("assets").update({ status: "rejected", feedback: feedbackMsg }).eq("id", asset_id).catch(console.error);

    return new Response(JSON.stringify({ error: feedbackMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
