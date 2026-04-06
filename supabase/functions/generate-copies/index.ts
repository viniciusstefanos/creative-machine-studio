import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Claude API error:", res.status, errText);
    if (res.status === 429) throw new Error("rate_limit");
    if (res.status === 402 || res.status === 400) throw new Error("credits");
    throw new Error("ai_failed");
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

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

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um copywriter de performance digital brasileiro. Gere copies de marketing baseados no brief fornecido. Responda APENAS com um JSON array válido, sem markdown, sem explicação.`;

    const userPrompt = `BRIEF DA ATIVAÇÃO: "${activation_name}"
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

    const content = await callClaude(systemPrompt, userPrompt, anthropicKey);

    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    // Also try to find array directly
    if (!jsonStr.startsWith("[")) {
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) jsonStr = arrayMatch[0];
    }

    let copies;
    try {
      copies = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse Claude response:", content);
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
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "rate_limit" ? 429 : msg === "credits" ? 402 : 500;
    return new Response(JSON.stringify({ error: msg === "rate_limit" ? "Limite de requisições. Tente novamente." : msg === "credits" ? "Créditos insuficientes." : "Erro interno" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
