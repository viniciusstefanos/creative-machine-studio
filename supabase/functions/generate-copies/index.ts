import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { activation_id, brief, activation_name, channels, funnel_stages } = await req.json();

    if (!activation_id || !brief) {
      return new Response(JSON.stringify({ error: "activation_id and brief are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é um copywriter de performance digital. Gere copies de marketing baseados no brief abaixo.

BRIEF DA ATIVAÇÃO: "${activation_name}"
- Objetivos: ${brief.objectives || "Não especificado"}
- Público-alvo: ${brief.target_audience || "Não especificado"}
- Tom de voz: ${brief.tone_of_voice || "Não especificado"}
- Contexto extra: ${brief.extra_context || "Nenhum"}

CANAIS: ${(channels || ["instagram"]).join(", ")}
ETAPAS DO FUNIL: ${(funnel_stages || ["top", "mid", "bottom"]).join(", ")}

Para cada combinação de canal + etapa do funil, gere um copy com:
- hook: frase curta que captura atenção (máx 2 linhas)
- body: desenvolvimento do argumento (3-5 linhas)
- cta: chamada para ação clara (1 linha)
- type: "post" ou "ad"
- channel: o canal
- funnel_stage: "top", "mid" ou "bottom"

Responda APENAS com um JSON array válido. Exemplo:
[{"hook":"...","body":"...","cta":"...","type":"post","channel":"instagram","funnel_stage":"top"}]

Gere no máximo 6 copies variados.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let copies;
    try {
      copies = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert copies into database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const inserts = copies.map((c: any) => ({
      activation_id,
      hook: c.hook || "",
      body: c.body || "",
      cta: c.cta || "",
      full_copy: `${c.hook || ""}\n\n${c.body || ""}\n\n${c.cta || ""}`,
      type: c.type || "post",
      channel: c.channel || "",
      funnel_stage: c.funnel_stage || "top",
      status: "draft",
    }));

    const { data, error } = await supabase.from("copies").insert(inserts).select();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to save copies" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ copies: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
