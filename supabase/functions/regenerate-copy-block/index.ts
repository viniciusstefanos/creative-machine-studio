import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { block, current_content, feedback, brief_context, channel, funnel_stage } = await req.json();
    if (!block || !current_content) throw new Error("block and current_content are required");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const blockLabels: Record<string, string> = { hook: "Gancho (Hook)", body: "Corpo (Body)", cta: "CTA (Call to Action)" };

    const systemPrompt = `You are a marketing copywriter. Regenerate only the "${blockLabels[block] || block}" section of a marketing copy.
Keep the same language (Portuguese BR), tone, and style.
${brief_context ? `Brief context: ${brief_context}` : ""}
${channel ? `Channel: ${channel}` : ""}
${funnel_stage ? `Funnel stage: ${funnel_stage}` : ""}
Return ONLY the new text for this block, nothing else.`;

    const userPrompt = `Current ${block}: "${current_content}"${feedback ? `\n\nFeedback for improvement: "${feedback}"` : ""}\n\nRegenerate this ${block}:`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
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
      const errText = await aiResponse.text();
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("Claude error: " + errText);
    }

    const data = await aiResponse.json();
    const newContent = data.content?.[0]?.text?.trim() || "";

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
