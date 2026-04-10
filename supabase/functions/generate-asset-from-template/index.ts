import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { BRIEF_SYSTEM_PROMPT } from "../_shared/brief-system-prompt.ts";
import { getPrompt } from "../_shared/get-prompt.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { extractHtml } from "../_shared/extract-html.ts";
import { callTextAI } from "../_shared/call-ai.ts";
import { generateImage } from "../_shared/generate-image.ts";
import { fillTemplate, buildFilesContext, buildBrandInstructions, buildSocialInstruction, resolveBrandIdentity } from "../_shared/build-brief-context.ts";

// ─── Brazilian / Instagram-native context ────────────────────
const CONTEXT_BRASIL_INSTAGRAM = `
## CONTEXTO OBRIGATÓRIO — BRASIL 2026
- Público: Brasil. Linguagem nativa de Instagram BR.
- Tom: coloquial-profissional. Evitar anglicismos desnecessários, usar gírias brasileiras quando natural (ex: "bora", "dá match", "vibe", "rolê").
- Referência cultural: memes BR, trends do Reels/TikTok BR, estética brasileira (diversidade, cor, calor, naturalidade).

## DIMENSÕES OFICIAIS INSTAGRAM 2026
- Feed/Carrossel: 1080×1350px (4:5) — PADRÃO DOMINANTE
- Reels/Stories: 1080×1920px (9:16) — tela cheia, máx impacto
- Quadrado 1:1 = formato legado, perde alcance. EVITAR.

## BENCHMARKS REAIS 2026
- Carrossel educativo: 10.15% engagement rate, 3.1x mais que post único
- Reels 7-12s: 2.25x mais reach que estáticos, 82% completion rate
- Números ímpares no título (3, 5, 7): +22% CTR
- UGC-style: supera produções polidas em conversão
- Rosto na câmera: +35% conversão

## FORMATOS PERSUASIVOS VALIDADOS
- Carrossel educativo (5-10 slides): slide 1 = gancho impossível de ignorar, slides do meio = valor tangível, último = CTA claro
- Carrossel listicle: número ímpar no título, 1 item por slide, escaneável
- Reels hook-first: primeiros 0.5s decidem. Texto grande + movimento.
- Post feed estático 4:5: imagem forte + caption curta. Menos é mais.
- Post tipográfico: frase provocativa bold = alto share rate
`;

const HTML_CREATIVE_RULES = `
## REGRAS HTML — OBRIGATÓRIO

### DIMENSÕES E SAFE ZONES
- Raiz: EXATAMENTE width/height em px. box-sizing:border-box. Sem %, vh, vw.
- 4:5: padding 135px 80px | 9:16: padding 250px 96px 340px 96px | 1:1: padding 100px 80px

### TIPOGRAFIA
- Headline: 60-90px, weight 700-800, máx 8 palavras, line-height 1.1, letter-spacing -0.03em
- Sub: 36-48px | Corpo: mín 28px | CTA botão: mín 32px, weight 700
- Máx 2 famílias. SEMPRE Google Fonts via <link>.
- Pares: Playfair Display+DM Sans | Space Grotesk+Inter | Syne+DM Sans | Bebas Neue+Inter | Outfit+DM Sans

### HIERARQUIA VISUAL — 3 NÍVEIS
1. Âncora (headline/produto) 2. Suporte (sub/benefício) 3. CTA/detalhe
- Máx 2 linhas texto por bloco. Texto ≤20% da área. Espaço negativo ≥30%.

### ALINHAMENTO E LAYOUT
- Container principal: align-items:center.
- CTA botão: SEMPRE centralizado horizontalmente.
- Espaçamento entre blocos: gap:24px.

### CSS AVANÇADO
- text-shadow headlines, gradientes 3+ stops, glassmorphism
- Botão CTA: accent + box-shadow glow + padding 16px 48px + border-radius 8px
- NUNCA border-radius > 8px em botões. NUNCA border-radius > 12px.

### CORES
- 1 dominante + 1 suporte + 1 acento (CTA only). Contraste ≥4.5:1. Nunca #fff puro → #f5f5f0

### SOBREPOSIÇÃO TEXTO + IMAGEM (OBRIGATÓRIO para html_and_image)
- SEMPRE adicionar gradient overlay entre imagem de fundo e texto
- Gradiente: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)
- Mínimo: 40% da altura do container coberto pelo gradiente
- Alternativa: faixa sólida semitransparente (rgba(0,0,0,0.7)) na zona de texto
- text-shadow OBRIGATÓRIO em TODOS os textos sobre imagem: 0 2px 8px rgba(0,0,0,0.8)
- Botão CTA: background sólido opaco, NUNCA transparente sobre imagem. Texto centralizado com text-align:center e display:flex;align-items:center;justify-content:center
- Texto NUNCA diretamente sobre imagem sem proteção visual

### PROIBIÇÕES
- Texto ilegível, >2 fontes, >1 CTA, hierarquia ausente, fora da safe zone, system fonts genéricas

### CARROSSEL
- Slide 1: gancho que para o scroll. Meio: 1 ponto/slide, máx 3 linhas. Último: CTA claro.

### OUTPUT
Retorne SOMENTE HTML puro. ZERO markdown, explicação ou comentário.

### TEMPLATE BASE
\`\`\`
<link href="https://fonts.googleapis.com/css2?family={FONT_HEADLINE}:wght@400;500;600;700&family={FONT_BODY}:wght@400;500;600;700&display=swap" rel="stylesheet">
<div style="width:{W}px;height:{H}px;box-sizing:border-box;padding:{PADDING};background:linear-gradient(135deg,{BG1} 0%,{BG2} 100%);display:flex;flex-direction:column;justify-content:center;font-family:'{FONT_BODY}',sans-serif;overflow:hidden;position:relative">
  <!-- conteúdo -->
</div>
\`\`\`

${CONTEXT_BRASIL_INSTAGRAM}
`;

const IMAGE_CREATIVE_RULES = `
## DIRETRIZES DE IMAGEM — INSTAGRAM BRASIL 2026

### COMPOSIÇÃO
- Hero shot: produto centralizado, iluminação lateral ou frontal difusa
- Lifestyle shot: produto em contexto de uso real
- Evite fotos de banco genéricas

### PESSOAS E ROSTOS
- Rostos aumentam taxa de parada (+35% conversão)
- Expressão autêntica, olhar direto para câmera

### ESTÉTICA INSTAGRAM BR 2026
- UGC-style > polido
- Lo-fi/analog: grana, tungsten warm, overlay de textura
- Alto contraste no frame inicial
- Proporção 4:5 para feed, 9:16 para Reels/Stories
`;

// ─── Generate optimized image prompt ─────────────────────────
async function generateImagePrompt(basePrompt: string, useClaude: boolean, anthropicKey: string, lovableKey: string, imageRules: string): Promise<string> {
  const res = await callTextAI(
    `Você é um especialista em prompts para geração de imagem para Instagram Brasil.\n\n${imageRules}\n\nReceba um rascunho de prompt e otimize-o. Retorne APENAS o prompt otimizado em inglês, sem explicação.`,
    `Rascunho de prompt: "${basePrompt}"\n\nOtimize este prompt para geração de imagem:`,
    useClaude, anthropicKey, lovableKey,
  );
  return res.trim() || basePrompt;
}

Deno.serve(async (req) => {
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

    async function saveRender(slideIndex: number, data: Record<string, any>) {
      const { error } = await supabase.from("asset_template_renders").insert(
        { asset_id, slide_index: slideIndex, ...data, status: "ready" },
      );
      if (error) console.error("saveRender error:", error);
    }

    function splitCopyIntoSlides(minSlides: number): string[] {
      const fullText = `${copy?.hook || ""}\n${copy?.body || ""}\n${copy?.cta || ""}`.trim();
      const sentences = fullText.split(/(?<=[.!?;])\s+/).filter(Boolean);
      if (sentences.length <= minSlides) {
        while (sentences.length < minSlides) sentences.push("");
        return sentences;
      }
      const result: string[] = [];
      const perSlide = Math.ceil(sentences.length / minSlides);
      for (let i = 0; i < sentences.length; i += perSlide) {
        result.push(sentences.slice(i, i + perSlide).join(" "));
      }
      return result;
    }

    const [templateRes, copyRes, briefRes, briefFilesRes, activationRes, dbBriefSystem, dbHtmlRules, dbImageRules] = await Promise.all([
      supabase.from("asset_templates").select("*").eq("id", template_id).single(),
      supabase.from("copies").select("*").eq("id", copy_id).single(),
      supabase.from("briefs").select("*").eq("activation_id", activation_id).maybeSingle(),
      supabase.from("brief_files").select("category, raw_text, extracted_fields, file_name").eq("activation_id", activation_id).not("raw_text", "is", null),
      supabase.from("activations").select("social_display_name, social_handle, social_avatar_url").eq("id", activation_id).single(),
      getPrompt(supabase, "brief_system", BRIEF_SYSTEM_PROMPT),
      getPrompt(supabase, "asset_html_rules", HTML_CREATIVE_RULES),
      getPrompt(supabase, "asset_image_rules", IMAGE_CREATIVE_RULES),
    ]);

    const template = templateRes.data;
    const copy = copyRes.data;
    const brief = briefRes.data;
    const briefFiles = briefFilesRes.data || [];
    const activationSocial = activationRes.data || {};

    if (!template || !copy) {
      await supabase.from("assets").update({ status: "rejected", feedback: "Template ou copy não encontrado." }).eq("id", asset_id);
      return new Response(JSON.stringify({ error: "Template or copy not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filesContext = buildFilesContext(briefFiles);
    const customPrompt = (brief as any)?.system_prompt ? `\n\n## INSTRUÇÕES CUSTOMIZADAS\n${(brief as any).system_prompt}` : "";
    const consolidated = (brief as any)?.consolidated_context || {};
    const consolidatedStr = Object.keys(consolidated).length > 0 ? JSON.stringify(consolidated, null, 2) : "";

    const config = render_config || {};
    const identity = resolveBrandIdentity(brief, briefFiles, consolidated);

    const context = {
      hook: copy.hook || "",
      body: copy.body || "",
      cta: copy.cta || "",
      full_copy: copy.full_copy || `${copy.hook || ""}\n${copy.body || ""}\n${copy.cta || ""}`,
      objectives: brief?.objectives || "",
      target_audience: brief?.target_audience || "",
      tone_of_voice: brief?.tone_of_voice || "",
      brand_colors: identity.brandColors,
      typography: identity.typography,
      visual_style: identity.visualStyle,
      brief_files_context: filesContext,
      ...config,
    };

    const brandInstr = buildBrandInstructions(
      { brand_colors: identity.brandColors, typography: identity.typography, visual_style: identity.visualStyle },
      config, identity.briefFileColors, identity.briefFileFonts,
    );
    const socialInstr = buildSocialInstruction(activationSocial);

    // ─── Branch by generation_type ────────────────────────────
    if (template.generation_type === "html_only") {
      const carouselInstruction = template.category === "carousel"
        ? `\n\nDivida o copy em ${template.slides_count_min} a ${template.slides_count_max} slides.\nSlide 1: sempre o GANCHO. Slides do meio: 1 ponto por slide. Slide final: CTA.\nRetorne APENAS um array JSON: [{"slide_index": 0, "html": "..."}]. Zero markdown.`
        : "";

      const systemWithRules = dbBriefSystem + "\n" + (template.system_prompt || "") + "\n" + dbHtmlRules + carouselInstruction + brandInstr + socialInstr + customPrompt;
      const briefContextBlock = consolidatedStr ? `\n\n## BRIEFING DO CLIENTE\n${consolidatedStr}` : "";
      const userPrompt = `Copy:\n- Hook: ${context.hook}\n- Body: ${context.body}\n- CTA: ${context.cta}\n\nDimensões: ${template.width_px}x${template.height_px}px\nConfig: ${JSON.stringify(config)}${briefContextBlock}`;

      const rawContent = await callTextAI(systemWithRules, userPrompt, useClaude, anthropicKey, lovableKey);

      if (template.category === "carousel") {
        let cleaned = rawContent.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
        const jsonStart = cleaned.indexOf("[");
        const jsonEnd = cleaned.lastIndexOf("]");
        if (jsonStart !== -1 && jsonEnd > jsonStart) cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
        let slides: Array<{ slide_index: number; html: string }>;
        try { slides = JSON.parse(cleaned); } catch { slides = [{ slide_index: 0, html: extractHtml(cleaned) }]; }
        for (const slide of slides) {
          slide.html = extractHtml(slide.html);
          await saveRender(slide.slide_index, { html_content: slide.html });
        }
      } else {
        const html = extractHtml(rawContent);
        await saveRender(0, { html_content: html });
        await supabase.from("assets").update({ html_content: html }).eq("id", asset_id);
      }

    } else if (template.generation_type === "image_only") {
      const slideParts = splitCopyIntoSlides(template.slides_count_min || 1);
      const maxSlides = Math.min(slideParts.length, template.slides_count_max || 5);

      for (let i = 0; i < maxSlides; i++) {
        const filledPrompt = fillTemplate(template.image_prompt_template || "", { ...context, slide_content: slideParts[i] });
        const optimizedPrompt = await generateImagePrompt(filledPrompt, useClaude, anthropicKey, lovableKey, dbImageRules);
        const imageUrl = await generateImage(optimizedPrompt, lovableKey, supabase, asset_id);
        await saveRender(i, { image_url: imageUrl });
        if (maxSlides === 1 && imageUrl) {
          await supabase.from("assets").update({ image_url: imageUrl }).eq("id", asset_id);
        }
      }

    } else if (template.generation_type === "html_and_image") {
      const filledPrompt2 = fillTemplate(template.image_prompt_template || "", context);
      const optimizedPrompt = await generateImagePrompt(filledPrompt2, useClaude, anthropicKey, lovableKey, dbImageRules);
      const bgImageUrl = await generateImage(optimizedPrompt, lovableKey, supabase, asset_id);

      const overlaySystem = dbBriefSystem + "\n" + (template.system_prompt || "") + "\n" + dbHtmlRules + brandInstr + socialInstr + customPrompt;
      const briefContextBlock2 = consolidatedStr ? `\n\n## BRIEFING DO CLIENTE\n${consolidatedStr}` : "";
      const overlayPrompt = `Copy:\n- Hook: ${context.hook}\n- Body: ${context.body}\n- CTA: ${context.cta}\n\nDimensões: ${template.width_px}x${template.height_px}px\nImagem de fundo: ${bgImageUrl || "não disponível"}\nConfig: ${JSON.stringify(config)}${briefContextBlock2}`;
      const rawHtml = await callTextAI(overlaySystem, overlayPrompt, useClaude, anthropicKey, lovableKey);
      const html = extractHtml(rawHtml);

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
    try {
      await supabase.from("assets").update({ status: "rejected", feedback: feedbackMsg }).eq("id", asset_id);
    } catch (cleanupErr) { console.error("Cleanup failed:", cleanupErr); }
    return new Response(JSON.stringify({ error: feedbackMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
