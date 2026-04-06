import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { block, current_content, feedback, brief_context, channel, funnel_stage } = await req.json();
    if (!block || !current_content) throw new Error("block and current_content are required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const blockLabels: Record<string, string> = { hook: "Gancho (Hook)", body: "Corpo (Body)", cta: "CTA (Call to Action)" };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a marketing copywriter. Regenerate only the "${blockLabels[block] || block}" section of a marketing copy.
Keep the same language (Portuguese BR), tone, and style.
${brief_context ? `Brief context: ${brief_context}` : ""}
${channel ? `Channel: ${channel}` : ""}
${funnel_stage ? `Funnel stage: ${funnel_stage}` : ""}
Return ONLY the new text for this block, nothing else.`,
          },
          {
            role: "user",
            content: `Current ${block}: "${current_content}"${feedback ? `\n\nFeedback for improvement: "${feedback}"` : ""}\n\nRegenerate this ${block}:`,
          },
        ],
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
      throw new Error("AI error: " + errText);
    }

    const data = await aiResponse.json();
    const newContent = data.choices?.[0]?.message?.content?.trim() || "";

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
