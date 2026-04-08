import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Você é um agente especialista em criação de conteúdo para redes sociais e anúncios pagos. Você pensa como DIRETOR CRIATIVO — não apenas redator.

## ESTRUTURA OBRIGATÓRIA DE COPY
[GANCHO] → [BENEFÍCIO/DOR] → [PROVA/DIFERENCIAL] → [CTA]

- Gancho: afirmação provocadora, pergunta, dado surpreendente ou oferta direta.
- Benefício/Dor: o que o cliente ganha ou qual problema resolve.
- Prova: número, depoimento resumido, selo, comparativo.
- CTA: ação clara, verbo no imperativo.

## REGRAS NÃO NEGOCIÁVEIS

### Hook primeiro, sempre
Nunca comece com: nome da marca, logo, saudação genérica ou contexto de apresentação.
Sempre comece com: conflito, dado surpreendente, pergunta que cria lacuna, afirmação contrarian ou cena de alto contraste.

**6 tipos de hook validados:**
1. Curiosidade: "Por que [resultado inesperado] acontece com quem faz X?"
2. Contrarian: "Tudo que você aprendeu sobre X está errado."
3. Prova social: Número específico + resultado
4. Problema direto: Nomeia a dor antes de qualquer solução
5. Antes/depois: Contraste imediato (visual ou verbal)
6. Urgência real: Escassez verdadeira com especificidade

### Headlines
- Máximo 8 palavras para impacto
- Fórmulas eficazes: benefício direto, urgência+escassez, prova social, pergunta-problema, novidade

### Uma mensagem por peça
Cada copy tem um único objetivo. Uma única promessa. Um único CTA.

### Especificidade > generalidade
"Melhor hambúrguer da cidade" não comunica nada.
"200g de blend angus, queijo derretido na chapa, servido em 8 minutos" comunica muito.

### CTA fecha o loop do hook
Se o hook criou uma lacuna de curiosidade, o CTA fecha essa lacuna com uma ação concreta.

### CTAs — Regras Obrigatórias
- Todo criativo deve ter exatamente 1 CTA principal.
- CTAs PROIBIDOS: "Clique aqui", "Saiba mais" sem contexto.

### Prova social
Inclua ao menos um dos seguintes quando aplicável:
- Avaliação média + número de reviews
- Quantidade de clientes/pedidos/anos de operação
- Premiações, certificações, selos
- Trecho de depoimento real (máx 15 palavras)
⚠ Nunca invente dados — use apenas informações do brief.

## ANTI-PATTERNS (NUNCA FAZER)
- CTA genérico tipo "Saiba mais" sem contexto
- Copy que serve para qualquer marca (sem especificidade)
- Começar com nome da marca
- Comprimir múltiplas mensagens em uma peça
- Texto genérico sem detalhes sensoriais
- Inventar dados de prova social

Responda APENAS com um JSON array válido, sem markdown, sem explicação.`;

const ORGANIC_RULES = `
## REGRAS ESPECÍFICAS — ORGÂNICO
- Caption longo é bem-vindo (até 2200 caracteres no Instagram).
- Inclua hashtags relevantes (5-10) no final do body.
- CTA de engajamento: "Salve este post", "Marque alguém que precisa ver isso", "Comente sua experiência", "Compartilhe nos stories".
- Tom conversacional e próximo. Use perguntas abertas.
- Storytelling é mais eficaz que venda direta.
- Explore formatos: carrossel educativo, reels com hook forte, stories interativos.
- Priorize valor e conexão emocional sobre conversão direta.

## REGRAS POR FASE DE FUNIL (ORGÂNICO)
- **Topo**: Entretenimento, curiosidade, awareness. Conteúdo viral, memes contextualizados, dados surpreendentes.
- **Meio**: Educação, engajamento. Enquetes, perguntas, behind-the-scenes, dicas práticas.
- **Fundo**: Prova social, depoimentos, resultados. CTA suave para DM ou link na bio.`;

const ADS_RULES = `
## REGRAS ESPECÍFICAS — ADS (TRÁFEGO PAGO)
- Texto CURTO e direto. Primary text: máx 125 caracteres visíveis (antes do "ver mais").
- Hook nos primeiros 3 segundos / primeiras 2 linhas.
- CTA de CONVERSÃO: "Compre agora", "Peça pelo WhatsApp", "Agende sua consulta", "Garanta sua vaga", "Aproveite a oferta".
- NUNCA use CTAs passivos como "Salve" ou "Compartilhe" — isso é orgânico.
- Headline (hook): máx 40 caracteres para não cortar no feed.
- Foque em benefício direto + urgência/escassez quando aplicável.
- Cada copy deve funcionar independente — o usuário não conhece a marca.
- Inclua prova social numérica sempre que possível.

## REGRAS POR FASE DE FUNIL (ADS)
- **Topo**: Problema/dor + curiosidade. Awareness com volume. Hook emocional ou contrarian.
- **Meio**: Retargeting. Prova social, comparativo, oferta de conteúdo gratuito (isca).
- **Fundo**: Oferta direta, urgência real, escassez. CTA forte de compra/agendamento.`;

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
    const { activation_id, brief, activation_name, channels, funnel_stages, purpose = "both", quantity = 6, topic } = await req.json();

    const safeQuantity = Math.min(Math.max(Number(quantity) || 6, 1), 20);

    if (!activation_id || !brief) {
      return new Response(JSON.stringify({ error: "activation_id and brief are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: briefFiles } = await supabase
      .from("brief_files")
      .select("category, raw_text, file_name")
      .eq("activation_id", activation_id)
      .not("raw_text", "is", null);

    const filesContext = briefFiles?.length
      ? "\n\n## DOCUMENTOS DE REFERÊNCIA COMPLETOS\n" +
        briefFiles.map((f: any) => `### [${f.category}] ${f.file_name}\n${(f.raw_text || "").slice(0, 8000)}`).join("\n\n")
      : "";

    const topicBlock = topic
      ? `\nASSUNTO/DOR ESPECÍFICA: ${topic}. Todas as copies DEVEM abordar esse tema/dor como eixo central.\n`
      : "";

    const briefBlock = `BRIEF DA ATIVAÇÃO: "${activation_name}"
- Objetivos: ${brief.objectives || "Não especificado"}
- Público-alvo: ${brief.target_audience || "Não especificado"}
- Tom de voz: ${brief.tone_of_voice || "Não especificado"}
- Contexto extra: ${brief.extra_context || "Nenhum"}
- Cores da marca: ${brief.brand_colors || "Não especificado"}
- Tipografia: ${brief.typography || "Não especificado"}
- Estilo visual: ${brief.visual_style || "Não especificado"}
${filesContext}
${topicBlock}
CANAIS: ${(channels || ["instagram"]).join(", ")}
ETAPAS DO FUNIL: ${(funnel_stages || ["top", "mid", "bottom"]).join(", ")}`;

    const purposesToGenerate: string[] =
      purpose === "both" ? ["organic", "ads"] : [purpose];

    let allCopies: any[] = [];

    for (const p of purposesToGenerate) {
      const purposeRules = p === "organic" ? ORGANIC_RULES : ADS_RULES;
      const systemPrompt = BASE_SYSTEM_PROMPT + "\n" + purposeRules;

      const purposeInstruction = p === "organic"
        ? `FINALIDADE: ORGÂNICO — gere copies para publicação orgânica. Caption longo, hashtags, CTA de engajamento.`
        : `FINALIDADE: ADS (TRÁFEGO PAGO) — gere copies para anúncios pagos. Texto curto, direto, CTA de conversão.`;

      const quantityForPurpose = purpose === "both" ? Math.ceil(safeQuantity / 2) : safeQuantity;

      const userPrompt = `${briefBlock}

${purposeInstruction}

Para cada combinação de canal + etapa do funil, gere um copy com:
- hook: frase curta que captura atenção (máx 8 palavras)
- body: desenvolvimento do argumento com detalhes específicos${p === "organic" ? ". Inclua hashtags relevantes no final." : ". Máx 125 caracteres visíveis."}
- cta: chamada para ação${p === "organic" ? " de engajamento (salvar, comentar, compartilhar)" : " de conversão (comprar, agendar, pedir)"}
- type: "post" ou "ad"
- channel: o canal
- funnel_stage: "top", "mid" ou "bottom"

Gere exatamente ${quantityForPurpose} copies variados.

Responda APENAS com um JSON array válido. Exemplo:
[{"hook":"...","body":"...","cta":"...","type":"${p === "organic" ? "post" : "ad"}","channel":"instagram","funnel_stage":"top"}]`;

      const content = await callClaude(systemPrompt, userPrompt, anthropicKey);

      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      if (!jsonStr.startsWith("[")) {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) jsonStr = arrayMatch[0];
      }

      let copies;
      try {
        copies = JSON.parse(jsonStr);
      } catch {
        console.error("Failed to parse Claude response for purpose:", p, content);
        continue;
      }

      const inserts = copies.map((c: any) => ({
        activation_id,
        hook: c.hook || "",
        body: c.body || "",
        cta: c.cta || "",
        full_copy: `${c.hook || ""}\n\n${c.body || ""}\n\n${c.cta || ""}`,
        type: c.type || (p === "organic" ? "post" : "ad"),
        channel: c.channel || "",
        funnel_stage: c.funnel_stage || "top",
        status: "draft",
        purpose: p,
      }));

      const { data, error } = await supabase.from("copies").insert(inserts).select();
      if (error) {
        console.error("Insert error for purpose:", p, error);
        continue;
      }
      allCopies = allCopies.concat(data || []);
    }

    if (allCopies.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to generate copies" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ copies: allCopies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "rate_limit" ? 429 : msg === "credits" ? 402 : 500;
    return new Response(JSON.stringify({ error: msg === "rate_limit" ? "Limite de requisições. Tente novamente." : msg === "credits" ? "Créditos insuficientes." : "Erro interno" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
