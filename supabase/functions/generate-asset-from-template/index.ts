import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";
import { BRIEF_SYSTEM_PROMPT } from "../_shared/brief-system-prompt.ts";
import { getPrompt } from "../_shared/get-prompt.ts";

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
## REGRAS HTML — OBRIGATÓRIO

### DIMENSÕES E SAFE ZONES
- Raiz: EXATAMENTE width/height em px (ex: 1080x1350). box-sizing:border-box. Sem %, vh, vw.
- 4:5: padding 135px 80px | 9:16: padding 250px 96px 340px 96px | 1:1: padding 100px 80px
- Conteúdo centralizado dentro da safe zone. Nada crítico fora.

### TIPOGRAFIA
- Headline: 60-90px, weight 700-800, máx 8 palavras, line-height 1.1, letter-spacing -0.03em
- Sub: 36-48px, weight 400-500 | Corpo: mín 28px | CTA botão: mín 32px, weight 700
- Máx 2 famílias (1 display + 1 corpo). SEMPRE Google Fonts via <link>.
- Pares: Playfair Display+DM Sans (lifestyle) | Space Grotesk+Inter (tech) | Syne+DM Sans (bold) | Bebas Neue+Inter (promo) | Outfit+DM Sans (minimal)

### HIERARQUIA VISUAL — 3 NÍVEIS
1. Âncora (headline/produto) 2. Suporte (sub/benefício) 3. CTA/detalhe
- Máx 2 linhas texto por bloco. Texto ≤20% da área. Espaço negativo ≥30%.

### ALINHAMENTO E LAYOUT
- Container principal: align-items:center para centralizar todos os elementos horizontalmente.
- CTA botão: SEMPRE centralizado horizontalmente (align-self:center ou text-align:center no container).
- NUNCA alinhe o CTA à esquerda (flex-start) ou à direita (flex-end) — SEMPRE centralizado.
- Todos os blocos de texto: text-align:center por padrão em posts single. Carrossel pode ser left-aligned.
- Espaçamento entre blocos: gap:24px no container flex.

### CSS AVANÇADO
- text-shadow headlines, gradientes 3+ stops, radial-gradient focal, glassmorphism
- Elementos decorativos: linhas de acento, círculos position:absolute opacity:0.1
- Botão CTA: accent + box-shadow glow + padding 16px 48px + border-radius 8px + align-self:center
- NUNCA border-radius > 8px em botões. NUNCA border-radius > 12px em qualquer elemento.

### CORES
- 1 dominante + 1 suporte + 1 acento (CTA only). Contraste ≥4.5:1. Nunca #fff puro → #f5f5f0
- Gradientes sutis > sólidos. Overlay obrigatório sobre imagens.

### PROIBIÇÕES
- Texto ilegível, >2 fontes, >1 CTA, hierarquia ausente, fora da safe zone, system fonts genéricas

### CARROSSEL
- Slide 1: gancho que para o scroll. Meio: 1 ponto/slide, máx 3 linhas. Último: CTA claro.
- Mesmas dimensões/padding/paleta em todos os slides.

### OUTPUT
Retorne SOMENTE HTML puro. ZERO markdown, explicação ou comentário. Comece com <link> ou <div>.

### TEMPLATE BASE (exemplo — SUBSTITUA as fontes pelas da marca quando especificadas no briefing)
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
      model: "google/gemini-2.5-pro",
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
async function generateImagePrompt(basePrompt: string, useClaude: boolean, anthropicKey: string, lovableKey: string, imageRules: string): Promise<string> {
  const res = await callTextAI(
    `Você é um especialista em prompts para geração de imagem para Instagram Brasil.

${imageRules}

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

    // ─── Helper: save render to asset_template_renders ─────────
    async function saveRender(slideIndex: number, data: Record<string, any>) {
      const { error } = await supabase.from("asset_template_renders").insert(
        { asset_id, slide_index: slideIndex, ...data, status: "ready" },
      );
      if (error) console.error("saveRender error:", error);
    }

    // ─── Helper: split copy into N slide parts ─────────────────
    function splitCopyIntoSlides(minSlides: number): string[] {
      const fullText = `${copy?.hook || ""}\n${copy?.body || ""}\n${copy?.cta || ""}`.trim();
      const sentences = fullText.split(/(?<=[.!?;])\s+/).filter(Boolean);
      if (sentences.length <= minSlides) {
        // Pad with empty strings if fewer sentences than slides
        while (sentences.length < minSlides) sentences.push("");
        return sentences;
      }
      // Distribute sentences across slides
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

    // Build brief files context with extracted_fields + raw_text
    const filesContext = briefFiles.length
      ? briefFiles.map((f: any) => {
          const efStr = f.extracted_fields ? `\n**Dados estruturados:**\n${JSON.stringify(f.extracted_fields, null, 2)}` : "";
          return `[${f.category}] ${f.file_name}:${efStr}\n${(f.raw_text || "").slice(0, 15000)}`;
        }).join("\n\n---\n\n")
      : "";

    // Custom system prompt from brief
    const customPrompt = (brief as any)?.system_prompt ? `\n\n## INSTRUÇÕES CUSTOMIZADAS\n${(brief as any).system_prompt}` : "";

    // Extract consolidated context for rich brief data
    const consolidated = (brief as any)?.consolidated_context || {};
    const consolidatedStr = Object.keys(consolidated).length > 0
      ? JSON.stringify(consolidated, null, 2)
      : "";

    const config = render_config || {};

    // Resolve visual identity: prefer explicit brief fields, then consolidated_context, then brief_files
    const resolvedBrandColors = (brief as any)?.brand_colors
      || consolidated.visual_guidelines?.colors
      || consolidated.brand_colors
      || "";
    const resolvedTypography = (brief as any)?.typography
      || consolidated.visual_guidelines?.typography
      || consolidated.typography
      || "";
    const resolvedVisualStyle = (brief as any)?.visual_style
      || consolidated.visual_guidelines?.style
      || consolidated.visual_style
      || "";

    // If no brand colors from brief/consolidated, extract from brief_files
    let briefFileColors: string[] = [];
    let briefFileFonts: string[] = [];
    if (briefFiles.length > 0) {
      for (const f of briefFiles) {
        const ef = (f as any).extracted_fields;
        if (ef?.visual_guidelines?.colors_hex && !resolvedBrandColors) {
          for (const c of ef.visual_guidelines.colors_hex) {
            const hex = (c as string).match(/#[0-9A-Fa-f]{6}/)?.[0];
            if (hex && !briefFileColors.includes(hex)) briefFileColors.push(hex);
          }
        }
        if (ef?.visual_guidelines?.fonts && !resolvedTypography) {
          for (const font of ef.visual_guidelines.fonts) {
            if (font && typeof font === "string" && !briefFileFonts.includes(font)) {
              briefFileFonts.push(font);
            }
          }
        }
      }
    }

    const context = {
      hook: copy.hook || "",
      body: copy.body || "",
      cta: copy.cta || "",
      full_copy: copy.full_copy || `${copy.hook || ""}\n${copy.body || ""}\n${copy.cta || ""}`,
      objectives: brief?.objectives || "",
      target_audience: brief?.target_audience || "",
      tone_of_voice: brief?.tone_of_voice || "",
      brand_colors: resolvedBrandColors,
      typography: resolvedTypography,
      visual_style: resolvedVisualStyle,
      brief_files_context: filesContext,
      ...config,
    };

    // ─── Shared helpers: build brand/social instructions ──────
    function buildBrandInstructions(ctx: typeof context, renderCfg: Record<string, any>): string {
      let instructions = "";

      // Default colors from templates that should NOT be treated as brand colors
      const DEFAULT_COLORS = new Set(["#0a0a0a", "#00c9a7", "#f5f5f0", "#111111", "#ffffff"]);
      const isRealColor = (c: string) => c && /^#[0-9A-Fa-f]{6}$/i.test(c) && !DEFAULT_COLORS.has(c.toLowerCase());

      const hasExplicitBg = isRealColor(renderCfg.bg_color);
      const hasExplicitAccent = isRealColor(renderCfg.accent_color);
      const hasExplicitText = isRealColor(renderCfg.text_color);

      if (hasExplicitBg || hasExplicitAccent || hasExplicitText) {
        instructions += `\n\n## CORES DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)\nUse EXATAMENTE estas cores:`;
        if (hasExplicitBg) instructions += `\n- Cor de fundo: ${renderCfg.bg_color}`;
        if (hasExplicitAccent) instructions += `\n- Cor de acento/CTA: ${renderCfg.accent_color}`;
        if (hasExplicitText) instructions += `\n- Cor do texto: ${renderCfg.text_color}`;
        instructions += `\n- NÃO use cores genéricas. Use EXATAMENTE os hex acima.`;
      } else if (ctx.brand_colors) {
        instructions += `\n\n## CORES DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)\nA identidade visual do cliente define estas cores: ${ctx.brand_colors}\n- EXTRAIA os códigos hex desta descrição e aplique-os:\n  • Cor primária/dominante → fundo principal, seções, barras\n  • Cor secundária/suporte → textos, elementos de apoio\n  • Cor de acento/CTA → APENAS para botões e calls-to-action\n- NÃO use cores genéricas (#00C9A7, #FF6B6B, #0f0f23, etc.) quando as cores da marca estiverem definidas\n- NÃO invente cores. Use EXATAMENTE os hex fornecidos pelo cliente`;
      } else if (briefFileColors.length > 0) {
        // Fallback: colors found in brief_files extracted_fields
        instructions += `\n\n## CORES DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)\nCores extraídas dos documentos do briefing: ${briefFileColors.join(", ")}`;
        instructions += `\n- Use a 1ª cor como primária/destaque, a 2ª como fundo ou suporte, a 3ª como texto/detalhe.`;
        instructions += `\n- NÃO use cores genéricas (#00C9A7, #FF6B6B, etc.). Use EXATAMENTE os hex acima.`;
      }

      if (ctx.typography) {
        instructions += `\n\n## TIPOGRAFIA DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)
SUBSTITUA as fontes padrão do template (Space Grotesk, DM Sans, Inter, etc.) pelas fontes da marca: ${ctx.typography}
- Importe via Google Fonts com <link>. Se a fonte não existir no Google Fonts, use a mais próxima visualmente.
- NÃO use fontes genéricas (Inter, Arial, Helvetica, system-ui) quando as fontes da marca estiverem definidas.
- Aplique a hierarquia: font de display para títulos/headlines, font de corpo para body/labels/CTA.`;
      } else if (briefFileFonts.length > 0) {
        instructions += `\n\n## TIPOGRAFIA DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)
Fontes extraídas dos documentos do briefing: ${briefFileFonts.join(", ")}
- SUBSTITUA as fontes padrão do template pelas fontes acima.
- Importe via Google Fonts com <link>. Use a 1ª como headline e a 2ª como corpo.
- NÃO use fontes genéricas (Inter, Arial, Helvetica) quando as fontes da marca estiverem definidas.`;
      }
      if (ctx.visual_style) {
        instructions += `\n\n## ESTILO VISUAL DA MARCA (OBRIGATÓRIO)\nSiga este estilo visual: ${ctx.visual_style}\n`;
      }
      return instructions;
    }

    function buildSocialInstruction(social: any): string {
      if (!(social?.social_display_name || social?.social_handle)) return "";
      let instr = `\n\n## PERFIL SOCIAL (OBRIGATÓRIO nos templates que exibem perfil)\nNome: ${social.social_display_name || ""}\nHandle: ${social.social_handle || ""}\nFoto de perfil URL: ${social.social_avatar_url || ""}\nQuando o template incluir avatar, nome de perfil ou @handle, use EXATAMENTE estes dados.\nNÃO invente nomes de perfil ou handles fictícios.`;
      if (social.social_avatar_url) {
        instr += `\nPara avatar, use: <img src="${social.social_avatar_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />`;
      }
      return instr;
    }

    // ─── Branch by generation_type ────────────────────────────
    if (template.generation_type === "html_only") {
      const carouselInstruction = template.category === "carousel"
        ? `\n\nDivida o copy em ${template.slides_count_min} a ${template.slides_count_max} slides.\nSlide 1: sempre o GANCHO — visual forte que para o scroll, NUNCA título de relatório.\nSlides do meio: 1 ponto por slide, máx 3 linhas de texto. Visual consistente.\nSlide final: sempre o CTA único e claro.\nO usuário deve entender a proposta lendo apenas slide 1 e o último.\nRetorne APENAS um array JSON: [{"slide_index": 0, "html": "..."}]. Zero markdown.`
        : "";

      const brandInstructions = buildBrandInstructions(context, config);
      const socialInstruction = buildSocialInstruction(activationSocial);
      const systemWithRules = dbBriefSystem + "\n" + (template.system_prompt || "") + "\n" + dbHtmlRules + carouselInstruction + brandInstructions + socialInstruction + customPrompt;

      // Build rich brief context for user prompt
      const briefContextBlock = consolidatedStr
        ? `\n\n## BRIEFING DO CLIENTE (contexto completo — use para tom, estilo, valores, público)\n${consolidatedStr}`
        : "";

      const userPrompt = `Copy:\n- Hook: ${context.hook}\n- Body: ${context.body}\n- CTA: ${context.cta}\n\nDimensões: ${template.width_px}x${template.height_px}px\nConfig: ${JSON.stringify(config)}${briefContextBlock}`;

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
        const filledPrompt = fillTemplate(template.image_prompt_template || "", { ...context, slide_content: slideParts[i] });
        const optimizedPrompt = await generateImagePrompt(
          filledPrompt, useClaude, anthropicKey, lovableKey,
        );
        const imageUrl = await generateImage(optimizedPrompt, lovableKey, supabase, asset_id);
        await saveRender(i, { image_url: imageUrl });
        if (maxSlides === 1 && imageUrl) {
          await supabase.from("assets").update({ image_url: imageUrl }).eq("id", asset_id);
        }
      }

    } else if (template.generation_type === "html_and_image") {
      const filledPrompt2 = fillTemplate(template.image_prompt_template || "", context);
      const optimizedPrompt = await generateImagePrompt(
        filledPrompt2, useClaude, anthropicKey, lovableKey,
      );
      const bgImageUrl = await generateImage(optimizedPrompt, lovableKey, supabase, asset_id);

      const brandInstructions2 = buildBrandInstructions(context, config);
      const socialInstruction2 = buildSocialInstruction(activationSocial);
      const overlaySystem = dbBriefSystem + "\n" + (template.system_prompt || "") + "\n" + dbHtmlRules + brandInstructions2 + socialInstruction2 + customPrompt;
      const briefContextBlock2 = consolidatedStr
        ? `\n\n## BRIEFING DO CLIENTE\n${consolidatedStr}`
        : "";
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
    } catch (cleanupErr) {
      console.error("Cleanup failed:", cleanupErr);
    }

    return new Response(JSON.stringify({ error: feedbackMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
