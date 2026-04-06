import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Creative agent visual guidelines ────────────────────────
const HTML_CREATIVE_RULES = `
## REGRAS VISUAIS OBRIGATÓRIAS
- Máximo 2 linhas de texto visível no criativo
- Fonte grande o suficiente para leitura sem zoom em celular (mín 24px para títulos, 18px para corpo)
- Contraste obrigatório: texto claro em fundo escuro OU texto escuro em fundo claro
- Safe zone: nenhum texto importante nos 15% superior e inferior do frame (em 9:16)
- NUNCA começar com logo ou nome da marca — hook visual primeiro
- Hierarquia clara: hook > corpo > CTA (tamanhos decrescentes)
- Uma única mensagem por slide/peça

## PARA CARROSSEL
- Slide 1: PARA O SCROLL — visual forte + texto que cria lacuna ou promete entrega. NUNCA título de relatório.
- Slides do meio: 1 ponto por slide, máx 3 linhas de texto. Visual consistente (mesma paleta, mesma tipografia).
- Último slide: CTA único e claro.
- O usuário deve entender a proposta lendo apenas slide 1 e o último.
`;

const IMAGE_CREATIVE_RULES = `
## DIRETRIZES DE IMAGEM (VALIDADAS 2026)
- UGC-style > polido: conteúdo que parece feito por usuário supera produções de estúdio
- Rosto na câmera: pessoa olhando para câmera aumenta conversão em +35%
- Lo-fi/analog: grana, tungsten warm, overlay de textura (tendência validada)
- Lifestyle com pessoa em contexto real > produto isolado
- Alto contraste no frame inicial — nunca começar com imagem escura ou neutra
- Para produto: demonstração real em uso, não packshot isolado
- Cores dessaturadas + highlight quente para tom cinematográfico
- Evitar imagens genéricas de banco de imagens — buscar autenticidade
`;

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
    `Você é um especialista em prompts para geração de imagem. Receba um rascunho de prompt e melhore-o para gerar a melhor imagem possível.

${IMAGE_CREATIVE_RULES}

Retorne APENAS o prompt otimizado em inglês, sem explicação.`,
    `Rascunho de prompt: "${filled}"\n\nOtimize este prompt para geração de imagem seguindo as diretrizes visuais validadas:`,
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

    let base64Data: string | null = null;

    const imgUrl = choice?.message?.images?.[0]?.image_url?.url;
    if (imgUrl) {
      base64Data = imgUrl.includes(",") ? imgUrl.split(",")[1] : imgUrl;
    }

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

  const { asset_id, template_id, copy_id, activation_id, render_config, use_claude } = body;
  const useClaude = !!use_claude;
  if (!asset_id || !template_id || !copy_id || !activation_id) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
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
        ? `\n\nDivida o copy em ${template.slides_count_min} a ${template.slides_count_max} slides.\nSlide 1: sempre o GANCHO — visual forte que para o scroll, NUNCA título de relatório.\nSlides do meio: 1 ponto por slide, máx 3 linhas de texto. Visual consistente.\nSlide final: sempre o CTA único e claro.\nO usuário deve entender a proposta lendo apenas slide 1 e o último.\nRetorne APENAS um array JSON: [{"slide_index": 0, "html": "..."}]. Zero markdown.`
        : "";

      const systemWithRules = (template.system_prompt || "") + "\n" + HTML_CREATIVE_RULES + carouselInstruction;

      const userPrompt = `Copy:\n- Hook: ${context.hook}\n- Body: ${context.body}\n- CTA: ${context.cta}\n\nDimensões: ${template.width_px}x${template.height_px}px\nConfig: ${JSON.stringify(config)}`;

      const rawContent = await callTextAI(
        systemWithRules,
        userPrompt,
        useClaude, anthropicKey, lovableKey,
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
        const optimizedPrompt = await generateImagePrompt(
          template.image_prompt_template || "",
          { ...context, slide_content: slideParts[i] },
          useClaude, anthropicKey, lovableKey,
        );
        const imageUrl = await generateImage(optimizedPrompt, lovableKey, supabase, asset_id);
        await saveRender(i, { image_url: imageUrl });
        if (maxSlides === 1 && imageUrl) {
          await supabase.from("assets").update({ image_url: imageUrl }).eq("id", asset_id);
        }
      }

    } else if (template.generation_type === "html_and_image") {
      const optimizedPrompt = await generateImagePrompt(
        template.image_prompt_template || "",
        context,
        useClaude, anthropicKey, lovableKey,
      );
      const bgImageUrl = await generateImage(optimizedPrompt, lovableKey, supabase, asset_id);

      const overlaySystem = (template.system_prompt || "") + "\n" + HTML_CREATIVE_RULES;
      const overlayPrompt = `Copy:\n- Hook: ${context.hook}\n- Body: ${context.body}\n- CTA: ${context.cta}\n\nDimensões: ${template.width_px}x${template.height_px}px\nImagem de fundo: ${bgImageUrl || "não disponível"}\nConfig: ${JSON.stringify(config)}`;
      const rawHtml = await callTextAI(overlaySystem, overlayPrompt, useClaude, anthropicKey, lovableKey);
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
