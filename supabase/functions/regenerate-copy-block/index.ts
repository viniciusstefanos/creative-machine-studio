import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { BRIEF_SYSTEM_PROMPT } from "../_shared/brief-system-prompt.ts";
import { getPrompt } from "../_shared/get-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { block, current_content, feedback, brief_context, channel, funnel_stage, tone_of_voice, extra_context } = await req.json();
    if (!block || !current_content) throw new Error("block and current_content are required");

    const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";

    if (!lovableKey && !anthropicKey) throw new Error("No AI API key configured");

    const blockLabels: Record<string, string> = { hook: "Gancho (Hook)", body: "Corpo (Body)", cta: "CTA (Call to Action)" };

    // Dynamic tone instruction from brief instead of hardcoded food rules
    const toneInstruction = tone_of_voice
      ? `\n### Tom de voz do cliente: ${tone_of_voice}\nAdapte o tom da copy a este estilo.`
      : "";
    const extraInstruction = extra_context
      ? `\n### Contexto adicional: ${extra_context}`
      : "";

    const systemPrompt = `${BRIEF_SYSTEM_PROMPT}
You are an expert marketing copywriter for Meta Ads and Instagram. Regenerate only the "${blockLabels[block] || block}" section of a marketing copy.
Keep the same language (Portuguese BR), tone, and style.

## REGRAS OBRIGATÓRIAS
### Estrutura de copy: Gancho → Benefício/Dor → Prova → CTA
### Para Hook:
- Use um dos 6 tipos validados: curiosidade, contrarian, prova social, problema direto, antes/depois, urgência real
- Máximo 8 palavras para impacto
- NUNCA comece com nome da marca
### Para Body:
- Detalhes específicos e sensoriais (não genéricos)
- Estrutura: benefício/dor + prova/diferencial
- Máx 3-5 linhas
### Para CTA:
- Verbo no imperativo, específico ao segmento
- PROIBIDO: "Saiba mais", "Clique aqui" sem contexto
- O CTA deve fechar a lacuna criada pelo hook

### Anti-patterns (NUNCA):
- Copy genérico sem benefício ou proposta de valor
- Múltiplas mensagens numa peça
- Dados de prova social inventados
${toneInstruction}
${extraInstruction}
${brief_context ? `Brief context: ${brief_context}` : ""}
${channel ? `Channel: ${channel}` : ""}
${funnel_stage ? `Funnel stage: ${funnel_stage}` : ""}
Return ONLY the new text for this block, nothing else.`;

    const userPrompt = `Current ${block}: "${current_content}"${feedback ? `\n\nFeedback for improvement: "${feedback}"` : ""}\n\nRegenerate this ${block}:`;

    let newContent: string;

    if (lovableKey) {
      // Use Lovable AI Gateway (default)
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
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

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const errText = await aiResponse.text();
        throw new Error("AI error: " + errText);
      }

      const data = await aiResponse.json();
      newContent = data.choices?.[0]?.message?.content?.trim() || "";
    } else {
      // Fallback: Anthropic
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const errText = await aiResponse.text();
        throw new Error("AI error: " + errText);
      }

      const data = await aiResponse.json();
      newContent = data.content?.[0]?.text?.trim() || "";
    }

    return new Response(JSON.stringify({ content: newContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("regenerate-copy-block error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
