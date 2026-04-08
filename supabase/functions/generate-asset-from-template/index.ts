import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";
import { BRIEF_SYSTEM_PROMPT } from "../_shared/brief-system-prompt.ts";

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
- Para 4:5 (1080×1350): padding: 135px 80px — SANGRIA OBRIGATÓRIA de 135px acima e abaixo. Nenhum texto, logo ou elemento crítico nos primeiros 135px superiores ou nos últimos 135px inferiores. Isso garante visibilidade no grid 3:4 e no "ver mais".
- Para 9:16 (1080×1920): padding-top: 250px, padding-bottom: 340px, padding-left: 96px, padding-right: 96px — safe zones em pixels absolutos para evitar UI do sistema (câmera, botões nativos, barra de swipe)
- Para 1:1 (1080×1080): padding: 100px 80px
- NENHUM texto ou elemento importante pode ficar fora dessas safe zones
- O conteúdo deve estar centralizado verticalmente DENTRO da safe zone

### TIPOGRAFIA — TAMANHOS MÍNIMOS (canvas 1080px)
- Headline: mín 60px, ideal 72-90px, font-weight 700-800, máx 8 palavras
- Subheadline: mín 36px, ideal 40-48px, font-weight 400-500
- Corpo/Benefícios: mín 28px, font-weight 400-500
- CTA (botão): mín 32px, font-weight 700
- Disclaimers/asteriscos: mín 20px
- Número destaque: mín 100px, ideal 120-160px, font-weight 800
- line-height: 1.2 para títulos, 1.5 para corpo
- letter-spacing: -0.02em para títulos grandes
- Máximo 2 famílias tipográficas por criativo (1 display + 1 corpo)

### REGRA DOS 20%
- O texto NÃO deve cobrir mais de 20% da área total do criativo (diretriz Meta)
- Headlines: máximo 8 palavras para impacto
- Evite parágrafos corridos — prefira bullets curtos ou frases isoladas

### HIERARQUIA VISUAL — 3 NÍVEIS OBRIGATÓRIOS
1. Elemento âncora (maior, mais contrastante): produto, face ou headline
2. Elemento de suporte: subheadline, benefício chave, contexto visual
3. CTA ou detalhe: botão, logo, preço, selos
⚠ Se houver 4º elemento com peso visual equivalente = hierarquia quebrada. Remova ou reduza.

### ESPAÇO NEGATIVO
- Mínimo 30% da área deve ser espaço negativo para respiração visual
- Em layouts com muito texto (promoção): comprimir até 20%, nunca menos

### PROFUNDIDADE E CAMADAS — 3 PLANOS
- Fundo: cor sólida, gradiente, textura ou foto borrada
- Plano médio: elemento principal (produto, pessoa)
- Primeiro plano: texto, sobreposição, selo, sombra projetada

### CORES — PALETA OBRIGATÓRIA
- Defina sempre: 1 cor dominante + 1 cor de suporte + 1 cor de acento/CTA
- A cor de acento/CTA deve aparecer APENAS no elemento de ação — não dispersar
- Contraste obrigatório texto/fundo: ratio mín 4.5:1 (WCAG AA)
- Texto sobre imagem: overlay semitransparente, blur ou sombra de texto OBRIGATÓRIO
- Nunca apenas cor para diferenciar informações (usar forma ou ícone junto)
- Evitar: vermelho/verde, azul/violeta, verde/marrom juntos
- Psicologia food & beverage: vermelho/laranja=apetite, verde=saudável, marrom=artesanal, amarelo=alegria, preto=premium, azul=frescor

### REGRAS VISUAIS GERAIS
- Máximo 2 linhas de texto visível por bloco principal
- NUNCA começar com logo ou nome da marca — hook visual primeiro
- Uma única mensagem por slide/peça
- font-family: usar fontes system seguras: 'Inter', 'Helvetica Neue', Arial, sans-serif
- Evitar emojis como elemento principal de design — usar com moderação

### BACKGROUND
- NUNCA branco puro (#fff ou #ffffff) — usar off-white mín (#f5f5f0) ou cores com personalidade
- Gradientes sutis são preferíveis a cores sólidas
- Se usar imagem de fundo, aplicar overlay com opacity para garantir legibilidade

## PARA CARROSSEL
- Card 1: gancho forte, PARA O SCROLL — visual forte + texto que cria lacuna. NUNCA título de relatório. Deve funcionar ISOLADO.
- Slides do meio: 1 ponto por slide, máx 3 linhas de texto. Visual consistente (mesma paleta, mesma tipografia).
- Último slide: CTA único e claro com botão visual.
- Continuidade visual entre cards: bordas que "sangram", narrativa progressiva.
- Todos os slides devem ter EXATAMENTE as mesmas dimensões e a mesma estrutura de padding/safe-zone.
- O usuário deve entender a proposta lendo apenas slide 1 e o último.

## 10 PROIBIÇÕES ABSOLUTAS (invalida o criativo)
1. Texto ilegível por tamanho, contraste ou sobreposição
2. Mais de 2 famílias tipográficas sem justificativa conceitual
3. Logo cortado, distorcido ou em resolução baixa
4. Mais de 1 CTA principal competindo por atenção
5. Fotos pixeladas, escuras demais ou sem foco no produto
6. Hierarquia visual ausente (tudo com mesmo peso visual)
7. Elementos importantes fora da zona segura
8. Copy genérico sem benefício ou proposta de valor clara
9. Composição com 4 ou mais "focos visuais" simultâneos
10. Uso de imagens de terceiros sem direitos confirmados

## CHECKLIST FINAL ANTES DE GERAR
- [ ] Especificações técnicas respeitadas (resolução, proporção, zona segura)
- [ ] Hierarquia visual clara em 3 níveis ou menos
- [ ] Headline legível em thumbnail (visualização reduzida)
- [ ] CTA único, claro e com verbo de ação
- [ ] Contraste texto/fundo ≥ 4.5:1
- [ ] Elementos críticos dentro da zona segura
- [ ] Prova social ou diferencial visível (quando aplicável)

## TEMPLATE HTML OBRIGATÓRIO
Sempre inicie o HTML com esta estrutura base (incluindo o import de fontes):
\`\`\`
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<div style="width: {W}px; height: {H}px; box-sizing: border-box; padding: {PADDING}; background: {BG}; display: flex; flex-direction: column; justify-content: center; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; overflow: hidden; position: relative;">
  <!-- conteúdo aqui -->
</div>
\`\`\`
IMPORTANTE: O \`<link>\` do Google Fonts DEVE estar presente no HTML final para garantir renderização correta das fontes tanto na preview quanto na exportação PNG.

## REGRA CRÍTICA DE OUTPUT
Retorne SOMENTE o código HTML. ZERO texto explicativo, ZERO markdown, ZERO comentários fora do HTML, ZERO análise ou justificativa. Apenas o HTML puro começando com <link> ou <div> e terminando com </div>.

${CONTEXT_BRASIL_INSTAGRAM}
`;

const IMAGE_CREATIVE_RULES = `
## DIRETRIZES DE IMAGEM — INSTAGRAM BRASIL 2026

### COMPOSIÇÃO FOTOGRÁFICA
- Hero shot: produto centralizado, iluminação lateral ou frontal difusa
- Lifestyle shot: produto em contexto de uso/consumo real
- Flat lay: vista superior, organização intencional, fundo neutro ou temático
- Evite fotos de banco genéricas — priorize fotos originais ou com edição forte de identidade

### EDIÇÃO E TRATAMENTO
- Temperatura de cor consistente com identidade da marca
- Saturação moderada — hiper-saturação artificial reduz credibilidade
- Sombras e luzes equilibradas: produto deve ser o ponto mais luminoso da cena
- Profundidade de campo: foco seletivo no produto principal

### PESSOAS E ROSTOS
- Rostos aumentam taxa de parada (+35% conversão com olhar direto)
- Expressão autêntica: sorrisos forçados ou poses corporativas reduzem conexão
- Olhar direto para câmera: cria conexão imediata com o espectador

### ESTÉTICA INSTAGRAM BR 2026
- UGC-style > polido: conteúdo que parece feito por usuário supera produções de estúdio
- Lo-fi/analog: grana, tungsten warm, overlay de textura (tendência validada 2026)
- Lifestyle com pessoa em contexto real > produto isolado
- Alto contraste no frame inicial — nunca começar com imagem escura ou neutra
- Para produto: demonstração real em uso, não packshot isolado
- Proporção 4:5 (1080×1350) para feed/carrossel, 9:16 (1080×1920) para Reels/Stories

### PSICOLOGIA DE CORES — FOOD & BEVERAGE
- Vermelho/laranja: apetite, urgência, energia → promoções, fast food
- Verde: natural, saudável, frescor → orgânicos, veganos, saladas
- Marrom/terracota: artesanal, premium, quente → cafeterias, padarias, comfort food
- Amarelo: alegria, acessibilidade → ofertas, marcas jovens
- Preto/off-white: sofisticação, premium → fine dining, spirits, chocolate
- Azul: confiança, frescor → bebidas, frutos do mar (cautela em alimentos)

### CONTEXTO VISUAL BRASIL
- Pessoas brasileiras diversas (tom de pele, cabelo, contexto urbano/rural BR)
- Cenários brasileiros quando relevante: cidade, praia, escritório BR, apartamento BR
- Luz natural tropical: dourada, quente, alta exposição
- Estética Instagram BR: saturação moderada, filtro warm, vibe acessível
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

    const imageBytes = decodeBase64(base64Data);
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
    const [templateRes, copyRes, briefRes, briefFilesRes] = await Promise.all([
      supabase.from("asset_templates").select("*").eq("id", template_id).single(),
      supabase.from("copies").select("*").eq("id", copy_id).single(),
      supabase.from("briefs").select("*").eq("activation_id", activation_id).maybeSingle(),
      supabase.from("brief_files").select("category, raw_text, extracted_fields, file_name").eq("activation_id", activation_id).not("raw_text", "is", null),
    ]);

    const template = templateRes.data;
    const copy = copyRes.data;
    const brief = briefRes.data;
    const briefFiles = briefFilesRes.data || [];

    if (!template || !copy) {
      await supabase.from("assets").update({ status: "rejected", feedback: "Template ou copy não encontrado." }).eq("id", asset_id);
      return new Response(JSON.stringify({ error: "Template or copy not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build brief files context with extracted_fields + raw_text
    const filesContext = briefFiles.length
      ? briefFiles.map((f: any) => {
          const efStr = f.extracted_fields ? `\n**Dados estruturados:**\n${JSON.stringify(f.extracted_fields, null, 2)}` : "";
          return `[${f.category}] ${f.file_name}:${efStr}\n${(f.raw_text || "").slice(0, 15000)}`;
        }).join("\n\n---\n\n")
      : "";

    // Custom system prompt from brief
    const customPrompt = (brief as any)?.system_prompt ? `\n\n## INSTRUÇÕES CUSTOMIZADAS\n${(brief as any).system_prompt}` : "";

    const config = render_config || {};
    const context = {
      hook: copy.hook || "",
      body: copy.body || "",
      cta: copy.cta || "",
      full_copy: copy.full_copy || `${copy.hook || ""}\n${copy.body || ""}\n${copy.cta || ""}`,
      objectives: brief?.objectives || "",
      target_audience: brief?.target_audience || "",
      tone_of_voice: brief?.tone_of_voice || "",
      brand_colors: (brief as any)?.brand_colors || "",
      typography: (brief as any)?.typography || "",
      visual_style: (brief as any)?.visual_style || "",
      brief_files_context: filesContext,
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
        // Strip fences and any text before/after JSON array
        let cleaned = rawContent.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
        const jsonStart = cleaned.indexOf("[");
        const jsonEnd = cleaned.lastIndexOf("]");
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
        }
        let slides: Array<{ slide_index: number; html: string }>;
        try { slides = JSON.parse(cleaned); } catch {
          slides = [{ slide_index: 0, html: extractHtml(cleaned) }];
        }
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

    await supabase.from("assets").update({ status: "rejected", feedback: feedbackMsg }).eq("id", asset_id).catch(console.error);

    return new Response(JSON.stringify({ error: feedbackMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
