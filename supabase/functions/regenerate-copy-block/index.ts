import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { BRIEF_SYSTEM_PROMPT } from "../_shared/brief-system-prompt.ts";
import { getPrompt } from "../_shared/get-prompt.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callTextAI } from "../_shared/call-ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { block, current_content, feedback, brief_context, channel, funnel_stage, tone_of_voice, extra_context } = await req.json();
    if (!block || !current_content) throw new Error("block and current_content are required");

    const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    if (!lovableKey && !anthropicKey) throw new Error("No AI API key configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, serviceKey);

    const [briefSystemContent, regenContent] = await Promise.all([
      getPrompt(supabaseClient, "brief_system", BRIEF_SYSTEM_PROMPT),
      getPrompt(supabaseClient, "copy_regen", ""),
    ]);

    const blockLabels: Record<string, string> = { hook: "Gancho (Hook)", body: "Corpo (Body)", cta: "CTA (Call to Action)" };
    const toneInstruction = tone_of_voice ? `\n### Tom de voz do cliente: ${tone_of_voice}` : "";
    const extraInstruction = extra_context ? `\n### Contexto adicional: ${extra_context}` : "";

    const systemPrompt = regenContent
      ? `${briefSystemContent}\n${regenContent}${toneInstruction}${extraInstruction}\n${brief_context ? `Brief context: ${brief_context}` : ""}${channel ? `\nChannel: ${channel}` : ""}${funnel_stage ? `\nFunnel stage: ${funnel_stage}` : ""}\nReturn ONLY the new text for this block.`
      : `${briefSystemContent}
You are an expert marketing copywriter. Regenerate only the "${blockLabels[block] || block}" section.
Keep Portuguese BR, same tone and style.

## REGRAS
### Para Hook: 6 tipos validados, máx 8 palavras
### Para Body: Detalhes específicos, máx 3-5 linhas
### Para CTA: Verbo imperativo, PROIBIDO "Saiba mais" sem contexto
${toneInstruction}${extraInstruction}
${brief_context ? `Brief context: ${brief_context}` : ""}
${channel ? `Channel: ${channel}` : ""}
${funnel_stage ? `Funnel stage: ${funnel_stage}` : ""}
Return ONLY the new text for this block.`;

    const userPrompt = `Current ${block}: "${current_content}"${feedback ? `\n\nFeedback: "${feedback}"` : ""}\n\nRegenerate this ${block}:`;

    const newContent = await callTextAI(systemPrompt, userPrompt, false, anthropicKey, lovableKey);

    return new Response(JSON.stringify({ content: newContent.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("regenerate-copy-block error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
