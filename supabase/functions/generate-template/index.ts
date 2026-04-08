import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

REGRAS:
- Use apenas HTML + CSS inline (style="..."). Não use <script>, <link>, ou CSS externo.
- O template deve ter exatamente ${dim.w}x${dim.h}px.
- Use variáveis {{hook}}, {{body}}, {{cta}}, {{brand_color}}, {{image_url}} como placeholders.
- Tipografia: use system fonts (Arial, Helvetica, sans-serif).
- Retorne APENAS um JSON válido com os campos: html_scaffold, system_prompt, editable_fields, image_prompt_template.
- editable_fields deve ser um objeto onde cada chave é o nome do campo e o valor é {label, type, default, options?}.
- system_prompt é o prompt que será dado à IA quando for gerar o conteúdo HTML final para um asset específico.
- image_prompt_template é o template de prompt para geração de imagem de fundo (se aplicável).
${category === "carousel" ? "- Para carrossel, gere HTML com múltiplos slides separados por comentários <!-- SLIDE -->." : ""}`;

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
Retorne JSON com: html_scaffold, system_prompt, editable_fields, image_prompt_template.`,
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

Retorne JSON com: html_scaffold, system_prompt, editable_fields, image_prompt_template.`;
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
                html_scaffold: { type: "string", description: "Complete HTML template with inline CSS" },
                system_prompt: { type: "string", description: "System prompt for AI asset generation" },
                editable_fields: {
                  type: "object",
                  description: "Editable fields config as key-value pairs",
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
