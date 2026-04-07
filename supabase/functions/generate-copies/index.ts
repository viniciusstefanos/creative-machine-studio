import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREATIVE_AGENT_SYSTEM_PROMPT = `Você é um agente especialista em criação de conteúdo para redes sociais e anúncios pagos. Você pensa como DIRETOR CRIATIVO — não apenas redator.

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
Detalhes sensoriais e específicos geram credibilidade e desejo.

### CTA fecha o loop do hook
Se o hook criou uma lacuna de curiosidade, o CTA fecha essa lacuna com uma ação concreta.

### CTAs — Regras Obrigatórias
- Todo criativo deve ter exatamente 1 CTA principal.
- CTAs PROIBIDOS: "Clique aqui", "Saiba mais" sem contexto — são vagos e ineficazes.
- CTAs eficazes por segmento:
  - Food & beverage: "Peça agora", "Ver cardápio", "Reserve sua mesa", "Aproveitar oferta", "Pedir delivery"
  - Serviços: "Agende agora", "Solicite orçamento", "Fale com especialista"
  - E-commerce: "Compre agora", "Garanta o seu", "Adicionar ao carrinho"
  - Educação: "Inscreva-se grátis", "Baixe o guia", "Comece hoje"

### Máx 2 linhas de texto visível em peças visuais
Fonte grande o suficiente para ser lida sem zoom em celular.

### Prova social
Inclua ao menos um dos seguintes quando aplicável:
- Avaliação média + número de reviews
- Quantidade de clientes/pedidos/anos de operação
- Premiações, certificações, selos
- Trecho de depoimento real (máx 15 palavras)
- Dado específico: "Mais de 500 pedidos por semana"
⚠ Nunca invente dados — use apenas informações do brief.

## TOM DE VOZ POR SEGMENTO
| Segmento | Tom | Evitar |
|---|---|---|
| Fast food / delivery | Direto, energético, popular | Linguagem técnica, formalidade |
| Restaurante casual | Amigável, convidativo, sensorial | Arrogância, termos gastronômicos excessivos |
| Fine dining / premium | Sofisticado, evocativo, minimalista | Gírias, exclamações, emojis |
| Saudável / vegano | Leve, consciente, positivo | Julgamento, termos proibitivos |
| Bar / drinks | Descontraído, sedutor, atitude | Seriedade excessiva, linguagem corporativa |

## REGRAS POR FASE DE FUNIL
- **Topo**: Hook emocional, entretenimento, awareness. Reels/vídeo curto. Conflito ou curiosidade.
- **Meio**: Interativo, quente. Stories, enquetes, resposta direta. Aprofunda interesse.
- **Fundo**: Prova, processo, detalhe, CTA direto. Carrossel com argumentos concretos.

## ANTI-PATTERNS (NUNCA FAZER)
- CTA genérico tipo "Saiba mais" sem contexto
- Copy que serve para qualquer marca (sem especificidade)
- Começar com nome da marca
- Comprimir múltiplas mensagens em uma peça
- Texto genérico sem detalhes sensoriais
- Inventar dados de prova social

## ESTRUTURA DE CARROSSEL
- Slide 1: PARA O SCROLL — visual forte + texto que cria lacuna ou promete entrega. NUNCA título de relatório.
- Slides 2-4: Um ponto por slide. Máx 3 linhas de texto.
- Último slide: CTA único e claro.

## VARIAÇÕES A/B
- Teste uma variável por vez para isolar aprendizados
- Variáveis prioritárias: gancho visual, headline, cor de fundo, CTA, formato

## MÉTRICAS DE REFERÊNCIA
- CTR médio vídeo: 1,87% (maior de todos os formatos)
- Reels < 15s: 82% taxa de conclusão
- Rosto na câmera: +35% conversão
- Ad Strength "Excelente": +6% conversão média

Responda APENAS com um JSON array válido, sem markdown, sem explicação.`;

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

    const userPrompt = `BRIEF DA ATIVAÇÃO: "${activation_name}"
- Objetivos: ${brief.objectives || "Não especificado"}
- Público-alvo: ${brief.target_audience || "Não especificado"}
- Tom de voz: ${brief.tone_of_voice || "Não especificado"}
- Contexto extra: ${brief.extra_context || "Nenhum"}

CANAIS: ${(channels || ["instagram"]).join(", ")}
ETAPAS DO FUNIL: ${(funnel_stages || ["top", "mid", "bottom"]).join(", ")}

Para cada combinação de canal + etapa do funil, gere um copy com:
- hook: frase curta que captura atenção usando um dos 6 tipos validados (máx 8 palavras)
- body: desenvolvimento do argumento com detalhes específicos e sensoriais. Estrutura: benefício/dor + prova/diferencial (3-5 linhas)
- cta: chamada para ação com verbo no imperativo, específica ao segmento. NUNCA "Saiba mais" ou "Clique aqui" genérico. (1 linha)
- type: "post" ou "ad"
- channel: o canal
- funnel_stage: "top", "mid" ou "bottom"

IMPORTANTE:
- Cada copy deve ter UMA mensagem, UMA promessa, UM CTA.
- Nunca comece com nome da marca.
- Use detalhes específicos, não genéricos.
- O CTA deve fechar a lacuna criada pelo hook.
- Para topo de funil: hook emocional, curiosidade ou conflito.
- Para meio de funil: interativo, aprofundamento.
- Para fundo de funil: prova concreta + CTA direto.
- Inclua prova social quando o brief fornecer dados para isso.
- Adapte o tom de voz ao segmento do cliente.

Responda APENAS com um JSON array válido. Exemplo:
[{"hook":"...","body":"...","cta":"...","type":"post","channel":"instagram","funnel_stage":"top"}]

Gere no máximo 6 copies variados.`;

    const content = await callClaude(CREATIVE_AGENT_SYSTEM_PROMPT, userPrompt, anthropicKey);

    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
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
