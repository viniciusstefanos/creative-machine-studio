import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_path } = await req.json();
    if (!file_path) throw new Error("file_path is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage.from("briefs").download(file_path);
    if (downloadError || !fileData) throw new Error("Failed to download file: " + downloadError?.message);

    // Extract text from file
    const text = await fileData.text();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You extract structured brief information from marketing documents. Return a JSON object with these fields:
- tone_of_voice: string (the brand's tone of voice)
- target_audience: string (target audience description)
- objectives: string (campaign objectives)
- extra_context: string (any additional context)
- references_urls: string[] (any URLs found in the document)

Extract as much as possible. If a field is not found, return an empty string or empty array.`,
          },
          { role: "user", content: `Extract brief fields from this document:\n\n${text.slice(0, 15000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_brief",
              description: "Extract structured brief fields from the document",
              parameters: {
                type: "object",
                properties: {
                  tone_of_voice: { type: "string" },
                  target_audience: { type: "string" },
                  objectives: { type: "string" },
                  extra_context: { type: "string" },
                  references_urls: { type: "array", items: { type: "string" } },
                },
                required: ["tone_of_voice", "target_audience", "objectives", "extra_context", "references_urls"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_brief" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI error: " + errText);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const extracted = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-brief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
