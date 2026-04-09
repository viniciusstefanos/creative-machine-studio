import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Subset of HTML_CREATIVE_RULES for template creation ─────
const TEMPLATE_DESIGN_RULES = `
## REGRAS DE LAYOUT — O SCAFFOLD DEVE SEGUIR

### SAFE ZONES E PADDING
- Para 4:5 (1080×1350): padding: 135px 80px
- Para 9:16 (1080×1920): padding-top: 250px, padding-bottom: 340px, padding-left: 96px, padding-right: 96px
- Para 1:1 (1080×1080): padding: 100px 80px
- NENHUM texto ou elemento importante pode ficar fora dessas safe zones

### TIPOGRAFIA — TAMANHOS MÍNIMOS (canvas 1080px)
- Headline: mín 60px, ideal 72-90px, font-weight 700-800
- Subheadline: mín 36px, ideal 40-48px
- Corpo: mín 28px
- CTA (botão): mín 32px, font-weight 700
- Número destaque: mín 100px, ideal 120-160px
- Máximo 2 famílias tipográficas (1 display + 1 corpo)

### HIERARQUIA VISUAL — 3 NÍVEIS
1. Elemento âncora (maior, mais contrastante): headline ou imagem
2. Elemento de suporte: subheadline, benefício
3. CTA ou detalhe: botão, logo

### CORES — VARIÁVEIS OBRIGATÓRIAS
- Use {{bg_color}} para cor de fundo principal
- Use {{accent_color}} para CTA, destaques, elementos de ação
- Use {{text_color}} para cor de texto principal
- Contraste obrigatório texto/fundo: ratio mín 4.5:1
- NUNCA branco puro (#fff) — usar off-white mín (#f5f5f0)

### BACKGROUND
- Gradientes sutis são preferíveis a cores sólidas
- Se usar imagem de fundo, aplicar overlay com opacity para legibilidade

### BOTÕES / CTA
- display: inline-flex; align-items: center; justify-content: center
- padding mínimo: 16px 40px
- border-radius: 8px
- Cor de fundo: {{accent_color}}

### REGRA DOS 20%
- Texto NÃO deve cobrir mais de 20% da área total
- Headlines: máximo 8 palavras

### FONTES
- Use Google Fonts via <link href="https://fonts.googleapis.com/css2?family=..."> no HTML
- Recomendadas: Inter, Montserrat, Poppins, Playfair Display, Space Grotesk, DM Sans
- NUNCA use apenas system fonts genéricas como Arial/Helvetica
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, description, image_url, category, aspect_ratio, generation_type } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const dimensions: Record<string, { w: number; h: number }> = {
      "4:5": { w: 1080, h: 1350 },
      "9:16": { w: 1080, h: 1920 },
      "1:1": { w: 1080, h: 1080 },
    };
    const dim = dimensions[aspect_ratio] || dimensions["4:5"];

    const systemPrompt = `Você é um especialista em design de templates HTML para peças de marketing digital.
Você gera templates responsivos usando HTML+CSS inline, otimizados para renderização via screenshot.

REGRAS FUNDAMENTAIS:
- Use HTML + CSS inline (style="...").
- O template deve ter exatamente ${dim.w}x${dim.h}px como container raiz.
- Use Google Fonts via <link href="https://fonts.googleapis.com/css2?family=...&display=swap"> — NUNCA system fonts genéricas.
- Use as variáveis de cor obrigatórias: {{bg_color}}, {{accent_color}}, {{text_color}} no CSS inline.
- Outros placeholders disponíveis: {{hook}}, {{body}}, {{cta}}, {{image_url}}.
- Retorne APENAS um JSON válido com os campos: html_scaffold, system_prompt, editable_fields, image_prompt_template.

REGRAS PARA editable_fields:
- DEVE ser um objeto onde cada chave é o nome do campo e o valor é {label, type, default, options?}.
- OBRIGATORIAMENTE inclua estes 3 campos de cor:
  - "bg_color": {"label": "Cor de fundo", "type": "color", "default": "#0a0a0a"}
  - "accent_color": {"label": "Cor destaque", "type": "color", "default": "#00C9A7"}
  - "text_color": {"label": "Cor do texto", "type": "color", "default": "#ffffff"}
- Adicione outros campos editáveis conforme o design (ex: font_family, overlay_opacity, etc.)

REGRAS PARA system_prompt:
- O system_prompt gerado será usado pela IA que gera a peça final a partir deste template.
- Deve incluir instruções explícitas para:
  1. Usar as cores do briefing (bg_color, accent_color, text_color)
  2. Respeitar safe zones e tipografia mínima
  3. Seguir hierarquia visual de 3 níveis
  4. Limitar texto a max 2 linhas visíveis por bloco
  5. Usar Google Fonts via <link>

${TEMPLATE_DESIGN_RULES}

${category === "carousel" ? "- Para carrossel, gere HTML com múltiplos slides separados por comentários <!-- SLIDE -->.\n- Slide 1 = gancho forte, nunca título de relatório.\n- Slides do meio = 1 ponto por slide, max 3 linhas.\n- Último slide = CTA claro." : ""}

${category === "story" || category === "reels" ? "- Para stories/reels (9:16), respeite rigorosamente as safe zones: top 250px e bottom 340px livres de conteúdo." : ""}`;

    let userContent: any;

    if (mode === "from_image") {
      userContent = [
        {
          type: "text",
          text: `Analise esta imagem de referência e crie um template HTML equivalente.
Categoria: ${category}
Aspect ratio: ${aspect_ratio} (${dim.w}x${dim.h}px)
Tipo de geração: ${generation_type}

Extraia: layout, cores, tipografia, espaçamento, e recrie como HTML com CSS inline.
Use Google Fonts via <link> para tipografia (não system fonts).
Use {{bg_color}}, {{accent_color}}, {{text_color}} como variáveis de cor no CSS.
Retorne JSON com: html_scaffold, system_prompt, editable_fields (com bg_color, accent_color, text_color obrigatórios), image_prompt_template.`,
        },
        {
          type: "image_url",
          image_url: { url: image_url },
        },
      ];
    } else {
      userContent = `Crie um template HTML para peças de marketing digital.

Descrição: ${description}
Categoria: ${category}
Aspect ratio: ${aspect_ratio} (${dim.w}x${dim.h}px)
Tipo de geração: ${generation_type}

Use Google Fonts via <link> para tipografia (não system fonts).
Use {{bg_color}}, {{accent_color}}, {{text_color}} como variáveis de cor no CSS.
Retorne JSON com: html_scaffold, system_prompt, editable_fields (com bg_color, accent_color, text_color obrigatórios), image_prompt_template.`;
    }

    const payload: any = {
      model: mode === "from_image" ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_template",
            description: "Return the generated template data",
            parameters: {
              type: "object",
              properties: {
                html_scaffold: { type: "string", description: "Complete HTML template with inline CSS and Google Fonts <link>" },
                system_prompt: { type: "string", description: "System prompt for AI asset generation, including color/typography/safe-zone instructions" },
                editable_fields: {
                  type: "object",
                  description: "Editable fields config. MUST include bg_color, accent_color, text_color",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      type: { type: "string", enum: ["color", "select", "slider", "text"] },
                      default: {},
                      options: { type: "array", items: { type: "string" } },
                    },
                    required: ["label", "type", "default"],
                  },
                },
                image_prompt_template: { type: "string", description: "Image generation prompt template" },
              },
              required: ["html_scaffold", "system_prompt", "editable_fields"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "create_template" } },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("AI did not return structured output");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Ensure required color fields exist in editable_fields
    if (result.editable_fields) {
      if (!result.editable_fields.bg_color) {
        result.editable_fields.bg_color = { label: "Cor de fundo", type: "color", default: "#0a0a0a" };
      }
      if (!result.editable_fields.accent_color) {
        result.editable_fields.accent_color = { label: "Cor destaque", type: "color", default: "#00C9A7" };
      }
      if (!result.editable_fields.text_color) {
        result.editable_fields.text_color = { label: "Cor do texto", type: "color", default: "#ffffff" };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-template error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
