import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Brazilian / Instagram-native context ────────────────────
const CONTEXT_BRASIL_INSTAGRAM = `
## CONTEXTO OBRIGATÓRIO — BRASIL 2026
- Público: Brasil. Linguagem nativa de Instagram BR.
- Tom: coloquial-profissional. Evitar anglicismos desnecessários, usar gírias brasileiras quando natural (ex: "bora", "dá match", "vibe", "rolê").
- Referência cultural: memes BR, trends do Reels/TikTok BR, estética brasileira (diversidade, cor, calor, naturalidade).

## DIMENSÕES OFICIAIS INSTAGRAM 2026
- Feed/Carrossel: 1080×1350px (4:5) — PADRÃO DOMINANTE (substitui 1:1)
- Reels/Stories: 1080×1920px (9:16) — tela cheia, máx impacto
- Quadrado 1:1 = formato legado, perde alcance. EVITAR.

## BENCHMARKS REAIS 2026 (Buffer 45M+ posts, Metricool, Socialinsider)
- Carrossel educativo: 10.15% engagement rate, 3.1x mais que post único
- Reels 7-12s: 2.25x mais reach que estáticos, 82% completion rate
- Story com sticker interativo: 2x resposta vs passivo
- Números ímpares no título (3, 5, 7): +22% CTR
- UGC-style: supera produções polidas em conversão
- Rosto na câmera: +35% conversão
- Horários de pico BR: 12h-14h e 19h-21h (GMT-3)

## FORMATOS PERSUASIVOS VALIDADOS
- Carrossel educativo (5-10 slides): slide 1 = gancho impossível de ignorar, slides do meio = valor tangível, último = CTA claro
- Carrossel listicle: número ímpar no título, 1 item por slide, escaneável
- Carrossel antes/depois: prova visual direta. Alto save rate.
- Reels hook-first: primeiros 0.5s decidem. Texto grande + movimento.
- Post feed estático 4:5: imagem forte + caption curta. Menos é mais.
- Post tipográfico: frase provocativa bold = alto share rate
- Post dado/estatística: número gigante = alto save rate
- Story interativo: enquete, quiz, slider — nunca só imagem passiva. 2x resposta.
`;

// ─── Creative agent visual guidelines ────────────────────────
const HTML_CREATIVE_RULES = `
## REGRAS DE LAYOUT E DIMENSÕES — OBRIGATÓRIO
O HTML gerado DEVE seguir estas regras pixel-a-pixel:

### DIMENSÕES DO CONTAINER
- O elemento raiz deve ter EXATAMENTE width e height iguais às dimensões informadas (ex: 1080x1350 para 4:5, 1080x1920 para 9:16)
- Use box-sizing: border-box em tudo
- NUNCA use unidades relativas (%, vh, vw) para o container raiz — use px absoluto

### SAFE ZONES E PADDING
- Para 4:5 (1080×1350): padding-top: 120px, padding-bottom: 120px, padding-left: 80px, padding-right: 80px
- Para 9:16 (1080×1920): padding-top: 200px, padding-bottom: 250px, padding-left: 80px, padding-right: 80px
- Para 1:1 (1080×1080): padding: 100px 80px
- NENHUM texto ou elemento importante pode ficar fora dessas safe zones
- O conteúdo deve estar centralizado verticalmente DENTRO da safe zone

### TIPOGRAFIA — TAMANHOS MÍNIMOS
- Título/Hook: mín 64px, ideal 72-90px, font-weight 700-800
- Subtítulo/Corpo: mín 36px, ideal 40-48px, font-weight 400-500
- Metadado/Label: mín 28px, font-weight 500
- CTA: mín 40px, font-weight 700
- Número destaque: mín 100px, ideal 120-160px, font-weight 800
- line-height: 1.2 para títulos, 1.5 para corpo
- letter-spacing: -0.02em para títulos grandes

### ESPAÇAMENTO ENTRE ELEMENTOS
- Entre título e corpo: mín 40px
- Entre corpo e CTA: mín 50px
- Entre ícone/emoji e texto: mín 30px
- Margem entre blocos de conteúdo: 40-60px

### REGRAS VISUAIS
- Máximo 2 linhas de texto visível por bloco principal
- Contraste obrigatório: texto claro em fundo escuro OU texto escuro em fundo claro (ratio mín 4.5:1)
- NUNCA começar com logo ou nome da marca — hook visual primeiro
- Hierarquia clara: hook > corpo > CTA (tamanhos decrescentes)
- Uma única mensagem por slide/peça
- font-family: usar fontes system seguras: 'Inter', 'Helvetica Neue', Arial, sans-serif
- Evitar emojis como elemento principal de design — usar com moderação

### BACKGROUND
- NUNCA branco puro (#fff ou #ffffff) — usar off-white mín (#f5f5f0) ou cores com personalidade
- Gradientes sutis são preferíveis a cores sólidas
- Se usar imagem de fundo, aplicar overlay com opacity para garantir legibilidade

## PARA CARROSSEL
- Slide 1: PARA O SCROLL — visual forte + texto que cria lacuna ou promete entrega. NUNCA título de relatório.
- Slides do meio: 1 ponto por slide, máx 3 linhas de texto. Visual consistente (mesma paleta, mesma tipografia).
- Último slide: CTA único e claro com botão visual.
- Todos os slides devem ter EXATAMENTE as mesmas dimensões e a mesma estrutura de padding/safe-zone.
- Manter paleta de cores e tipografia idêntica entre slides.
- O usuário deve entender a proposta lendo apenas slide 1 e o último.

## TEMPLATE HTML OBRIGATÓRIO
Sempre inicie o HTML com esta estrutura base:
\`\`\`
<div style="width: {W}px; height: {H}px; box-sizing: border-box; padding: {PADDING}; background: {BG}; display: flex; flex-direction: column; justify-content: center; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; overflow: hidden; position: relative;">
  <!-- conteúdo aqui -->
</div>
\`\`\`

${CONTEXT_BRASIL_INSTAGRAM}
`;

const IMAGE_CREATIVE_RULES = `
## DIRETRIZES DE IMAGEM — INSTAGRAM BRASIL 2026
- UGC-style > polido: conteúdo que parece feito por usuário supera produções de estúdio (+35% conversão com rosto na câmera)
- Lo-fi/analog: grana, tungsten warm, overlay de textura (tendência validada 2026)
- Lifestyle com pessoa em contexto real > produto isolado
- Alto contraste no frame inicial — nunca começar com imagem escura ou neutra
- Para produto: demonstração real em uso, não packshot isolado
- Cores dessaturadas + highlight quente para tom cinematográfico
- Evitar imagens genéricas de banco de imagens — buscar autenticidade
- Proporção 4:5 (1080×1350) para feed/carrossel, 9:16 (1080×1920) para Reels/Stories

## CONTEXTO BRASIL 2026
- Pessoas brasileiras diversas (tom de pele, cabelo, contexto urbano/rural BR)
- Cenários brasileiros quando relevante: cidade, praia, escritório BR, apartamento BR
- Luz natural tropical: dourada, quente, alta exposição
- Estética Instagram BR: saturação moderada, filtro warm, vibe acessível
- Evitar estética "americana/europeia genérica" — buscar autenticidade brasileira
- Referência: trends Reels/TikTok BR, estética lo-fi, diversidade brasileira
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
async function generateImagePrompt(basePrompt: string, useClaude: boolean, anthropicKey: string, lovableKey: string): Promise<string> {
  const res = await callTextAI(
    `Você é um especialista em prompts para geração de imagem para Instagram Brasil.

${IMAGE_CREATIVE_RULES}

Receba um rascunho de prompt e otimize-o para gerar a melhor imagem possível, mantendo o contexto brasileiro e a estética Instagram BR.
Retorne APENAS o prompt otimizado em inglês, sem explicação.`,
    `Rascunho de prompt: "${basePrompt}"\n\nOtimize este prompt para geração de imagem seguindo as diretrizes visuais validadas:`,
    useClaude, anthropicKey, lovableKey,
  );
  return res.trim() || basePrompt;
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

  const { asset_id, template_id, copy_id, activation_id, render_config, use_claude, custom_image_prompt } = body;
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

    // Helper: get final image prompt (custom or auto-generated)
    const getImagePrompt = async (templatePrompt: string, ctx: Record<string, any>): Promise<string> => {
      // If user provided a custom prompt, optimize it but use it as base
      if (custom_image_prompt && custom_image_prompt.trim()) {
        return generateImagePrompt(custom_image_prompt.trim(), useClaude, anthropicKey, lovableKey);
      }
      // Otherwise fill template and optimize
      const filled = fillTemplate(templatePrompt, ctx);
      return generateImagePrompt(filled, useClaude, anthropicKey, lovableKey);
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
        const optimizedPrompt = await getImagePrompt(
          template.image_prompt_template || "",
          { ...context, slide_content: slideParts[i] },
        );
        const imageUrl = await generateImage(optimizedPrompt, lovableKey, supabase, asset_id);
        await saveRender(i, { image_url: imageUrl });
        if (maxSlides === 1 && imageUrl) {
          await supabase.from("assets").update({ image_url: imageUrl }).eq("id", asset_id);
        }
      }

    } else if (template.generation_type === "html_and_image") {
      const optimizedPrompt = await getImagePrompt(
        template.image_prompt_template || "",
        context,
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
