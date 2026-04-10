import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getPrompt } from "../_shared/get-prompt.ts";
import { corsHeaders } from "../_shared/cors.ts";

const TEMPLATE_DESIGN_RULES = `
## REGRAS DE LAYOUT — O SCAFFOLD DEVE SEGUIR

### SAFE ZONES E PADDING
- Para 4:5 (1080×1350): padding: 135px 80px
- Para 9:16 (1080×1920): padding-top: 250px, padding-bottom: 340px, padding-left: 96px, padding-right: 96px
- Para 1:1 (1080×1080): padding: 100px 80px

### TIPOGRAFIA — TAMANHOS MÍNIMOS (canvas 1080px)
- Headline: mín 60px, ideal 72-90px, font-weight 700-800
- Subheadline: mín 36px | Corpo: mín 28px | CTA (botão): mín 32px, font-weight 700
- line-height: 1.1 para títulos, 1.4 para corpo
- Máximo 2 famílias tipográficas

### PARES TIPOGRÁFICOS RECOMENDADOS (Google Fonts)
- Playfair Display + DM Sans | Space Grotesk + Inter | Syne + DM Sans
- Bebas Neue + Inter | Outfit + DM Sans | Nunito + DM Sans
NUNCA use apenas system fonts.

### HIERARQUIA VISUAL — 3 NÍVEIS
1. Elemento âncora 2. Elemento de suporte 3. CTA ou detalhe

### CORES — VARIÁVEIS OBRIGATÓRIAS
- {{bg_color}}, {{accent_color}}, {{text_color}}
- Contraste mín 4.5:1. NUNCA branco puro (#fff) → #f5f5f0

### CSS AVANÇADO
- text-shadow, gradientes 2-3 stops, elementos decorativos, botões com glow

### BOTÕES / CTA
- padding mínimo: 16px 48px, border-radius: 8px
- box-shadow: 0 4px 14px rgba(accent, 0.35)
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, description, image_url, category, aspect_ratio, generation_type } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, serviceKey);
    const dbTemplateDesign = await getPrompt(supabaseClient, "template_design", TEMPLATE_DESIGN_RULES);

    const dimensions: Record<string, { w: number; h: number }> = {
      "4:5": { w: 1080, h: 1350 },
      "9:16": { w: 1080, h: 1920 },
      "1:1": { w: 1080, h: 1080 },
    };
    const dim = dimensions[aspect_ratio] || dimensions["4:5"];

    const systemPrompt = `Você é um especialista em design de templates HTML para peças de marketing digital.
Use HTML + CSS inline, otimizados para renderização via screenshot.

REGRAS:
- Container raiz: exatamente ${dim.w}x${dim.h}px.
- Google Fonts via <link>. Use {{bg_color}}, {{accent_color}}, {{text_color}}.
- Outros placeholders: {{hook}}, {{body}}, {{cta}}, {{image_url}}.
- Retorne JSON com: html_scaffold, system_prompt, editable_fields, image_prompt_template.
- editable_fields DEVE incluir bg_color, accent_color, text_color.

${dbTemplateDesign}

${category === "carousel" ? "Para carrossel: múltiplos slides separados por <!-- SLIDE -->." : ""}
${category === "story" || category === "reels" ? "Para stories/reels (9:16): safe zones top 250px e bottom 340px." : ""}`;

    let userContent: any;
    if (mode === "from_image") {
      userContent = [
        { type: "text", text: `Analise esta imagem e crie um template HTML equivalente.\nCategoria: ${category}\nAspect ratio: ${aspect_ratio} (${dim.w}x${dim.h}px)\nTipo: ${generation_type}\n\nRetorne JSON com: html_scaffold, system_prompt, editable_fields, image_prompt_template.` },
        { type: "image_url", image_url: { url: image_url } },
      ];
    } else {
      userContent = `Crie um template HTML.\nDescrição: ${description}\nCategoria: ${category}\nAspect ratio: ${aspect_ratio} (${dim.w}x${dim.h}px)\nTipo: ${generation_type}\n\nRetorne JSON com: html_scaffold, system_prompt, editable_fields, image_prompt_template.`;
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: mode === "from_image" ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_template",
            description: "Return the generated template data",
            parameters: {
              type: "object",
              properties: {
                html_scaffold: { type: "string" },
                system_prompt: { type: "string" },
                editable_fields: { type: "object", additionalProperties: { type: "object", properties: { label: { type: "string" }, type: { type: "string", enum: ["color", "select", "slider", "text"] }, default: {}, options: { type: "array", items: { type: "string" } } }, required: ["label", "type", "default"] } },
                image_prompt_template: { type: "string" },
              },
              required: ["html_scaffold", "system_prompt", "editable_fields"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_template" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured output");

    const result = JSON.parse(toolCall.function.arguments);
    if (result.editable_fields) {
      if (!result.editable_fields.bg_color) result.editable_fields.bg_color = { label: "Cor de fundo", type: "color", default: "#0a0a0a" };
      if (!result.editable_fields.accent_color) result.editable_fields.accent_color = { label: "Cor destaque", type: "color", default: "#00C9A7" };
      if (!result.editable_fields.text_color) result.editable_fields.text_color = { label: "Cor do texto", type: "color", default: "#ffffff" };
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-template error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
