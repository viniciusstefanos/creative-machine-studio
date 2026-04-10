import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { BRIEF_SYSTEM_PROMPT } from "../_shared/brief-system-prompt.ts";
import { getPrompt } from "../_shared/get-prompt.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callTextAI } from "../_shared/call-ai.ts";

const BASE_SYSTEM_PROMPT = `${BRIEF_SYSTEM_PROMPT}

Você é um agente especialista em criação de conteúdo para redes sociais e anúncios pagos. Você pensa como DIRETOR CRIATIVO — não apenas redator.

## ESTRUTURA OBRIGATÓRIA DE COPY
[GANCHO] → [BENEFÍCIO/DOR] → [PROVA/DIFERENCIAL] → [CTA]

- Gancho: afirmação provocadora, pergunta, dado surpreendente ou oferta direta.
- Benefício/Dor: o que o cliente ganha ou qual problema resolve.
- Prova: número, depoimento resumido, selo, comparativo.
- CTA: ação clara, verbo no imperativo.

## REGRAS NÃO NEGOCIÁVEIS

### Hook primeiro, sempre
Nunca comece com: nome da marca, logo, saudação genérica.
Sempre comece com: conflito, dado surpreendente, pergunta, afirmação contrarian.

**6 tipos de hook validados:**
1. Curiosidade 2. Contrarian 3. Prova social 4. Problema direto 5. Antes/depois 6. Urgência real

### Headlines — Máximo 8 palavras
### Uma mensagem por peça
### Especificidade > generalidade
### CTA fecha o loop do hook
### CTAs PROIBIDOS: "Clique aqui", "Saiba mais" sem contexto.
### Prova social — use apenas informações do brief.

## ANTI-PATTERNS (NUNCA FAZER)
- CTA genérico, copy genérico, começar com marca, múltiplas mensagens, inventar dados

Responda APENAS com um JSON array válido, sem markdown, sem explicação.`;

const ORGANIC_RULES = `
## REGRAS ESPECÍFICAS — ORGÂNICO
- Caption longo (até 2200 chars). Hashtags (5-10) no final.
- CTA de engajamento: "Salve", "Marque alguém", "Comente", "Compartilhe".
- Tom conversacional. Storytelling > venda direta.

## REGRAS POR FASE DE FUNIL (ORGÂNICO)
- **Topo**: Entretenimento, curiosidade, awareness.
- **Meio**: Educação, engajamento. Enquetes, dicas práticas.
- **Fundo**: Prova social, depoimentos, resultados.`;

const ADS_RULES = `
## REGRAS ESPECÍFICAS — ADS (TRÁFEGO PAGO)
- Texto CURTO e direto. Primary text: máx 125 caracteres visíveis.
- Hook nos primeiros 3 segundos / primeiras 2 linhas.
- CTA de CONVERSÃO: "Compre agora", "Peça pelo WhatsApp", etc.
- NUNCA CTAs passivos como "Salve" ou "Compartilhe".
- Headline (hook): máx 40 caracteres.

## REGRAS POR FASE DE FUNIL (ADS)
- **Topo**: Problema/dor + curiosidade.
- **Meio**: Retargeting. Prova social, comparativo.
- **Fundo**: Oferta direta, urgência, CTA forte.`;

async function getNextBatchLabel(supabase: any, activationId: string): Promise<string> {
  const { data: distinctBatches } = await supabase
    .from("copies").select("batch_label").eq("activation_id", activationId).not("batch_label", "is", null);
  const uniqueLabels = new Set((distinctBatches || []).map((r: any) => r.batch_label));
  return `Lote #${uniqueLabels.size + 1}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { activation_id, brief, activation_name, channels, funnel_stages, purpose = "both", quantity = 6, topic, use_claude } = await req.json();
    const safeQuantity = Math.min(Math.max(Number(quantity) || 6, 1), 20);

    if (!activation_id || !brief) {
      return new Response(JSON.stringify({ error: "activation_id and brief are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    const useClaude = !!use_claude;

    if (!lovableKey && !anthropicKey) {
      return new Response(JSON.stringify({ error: "No AI API key configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const batchLabel = await getNextBatchLabel(supabase, activation_id);

    const [briefFilesRes, fullBriefRes] = await Promise.all([
      supabase.from("brief_files").select("category, raw_text, extracted_fields, file_name").eq("activation_id", activation_id).not("raw_text", "is", null),
      supabase.from("briefs").select("consolidated_context").eq("activation_id", activation_id).maybeSingle(),
    ]);

    const briefFiles = briefFilesRes.data || [];
    const consolidatedContext = (fullBriefRes.data as any)?.consolidated_context || {};

    const filesContext = briefFiles.length
      ? "\n\n## DOCUMENTOS DE REFERÊNCIA COMPLETOS\n" +
        briefFiles.map((f: any) => {
          const efStr = f.extracted_fields ? `\n**Dados estruturados:**\n${JSON.stringify(f.extracted_fields, null, 2)}` : "";
          return `### [${f.category}] ${f.file_name}${efStr}\n\n**Texto:**\n${(f.raw_text || "").slice(0, 15000)}`;
        }).join("\n\n---\n\n")
      : "";

    const consolidatedBlock = Object.keys(consolidatedContext).length > 0
      ? `\n\n## CONTEXTO CONSOLIDADO DO BRIEFING\n${JSON.stringify(consolidatedContext, null, 2)}`
      : "";

    const topicBlock = topic ? `\nASSUNTO/DOR ESPECÍFICA: ${topic}. Todas as copies DEVEM abordar esse tema/dor como eixo central.\n` : "";

    const briefBlock = `BRIEF DA ATIVAÇÃO: "${activation_name}"
- Objetivos: ${brief.objectives || "Não especificado"}
- Público-alvo: ${brief.target_audience || "Não especificado"}
- Tom de voz: ${brief.tone_of_voice || "Não especificado"}
- Contexto extra: ${brief.extra_context || "Nenhum"}
- Cores da marca: ${brief.brand_colors || "Não especificado"}
- Tipografia: ${brief.typography || "Não especificado"}
- Estilo visual: ${brief.visual_style || "Não especificado"}
${filesContext}
${consolidatedBlock}
${topicBlock}
CANAIS: ${(channels || ["instagram"]).join(", ")}
ETAPAS DO FUNIL: ${(funnel_stages || ["top", "mid", "bottom"]).join(", ")}`;

    const purposesToGenerate: string[] = purpose === "both" ? ["organic", "ads"] : [purpose];
    let allCopies: any[] = [];

    for (const p of purposesToGenerate) {
      const [briefSystemContent, copyBaseContent, purposeContent] = await Promise.all([
        getPrompt(supabase, "brief_system", BRIEF_SYSTEM_PROMPT),
        getPrompt(supabase, "copy_base", BASE_SYSTEM_PROMPT),
        p === "organic" ? getPrompt(supabase, "copy_organic", ORGANIC_RULES) : getPrompt(supabase, "copy_ads", ADS_RULES),
      ]);
      const customPrompt = brief.system_prompt ? `\n\n## INSTRUÇÕES CUSTOMIZADAS DA ATIVAÇÃO\n${brief.system_prompt}` : "";
      const systemPrompt = briefSystemContent + "\n" + copyBaseContent + "\n" + purposeContent + customPrompt;

      const purposeInstruction = p === "organic"
        ? `FINALIDADE: ORGÂNICO — gere copies para publicação orgânica.`
        : `FINALIDADE: ADS (TRÁFEGO PAGO) — gere copies para anúncios pagos.`;

      const quantityForPurpose = purpose === "both" ? Math.ceil(safeQuantity / 2) : safeQuantity;

      const userPrompt = `${briefBlock}\n\n${purposeInstruction}\n\nGere exatamente ${quantityForPurpose} copies variados.\nResponda APENAS com um JSON array válido. Exemplo:\n[{"hook":"...","body":"...","cta":"...","type":"${p === "organic" ? "post" : "ad"}","channel":"instagram","funnel_stage":"top"}]`;

      const content = await callTextAI(systemPrompt, userPrompt, useClaude, anthropicKey, lovableKey, { temperature: 0.8 });

      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      if (!jsonStr.startsWith("[")) {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) jsonStr = arrayMatch[0];
      }

      let copies;
      try { copies = JSON.parse(jsonStr); } catch { console.error("Failed to parse AI response:", p); continue; }

      const inserts = copies.map((c: any) => ({
        activation_id,
        hook: c.hook || "", body: c.body || "", cta: c.cta || "",
        full_copy: `${c.hook || ""}\n\n${c.body || ""}\n\n${c.cta || ""}`,
        type: c.type || (p === "organic" ? "post" : "ad"),
        channel: c.channel || "", funnel_stage: c.funnel_stage || "top",
        status: "draft", purpose: p, batch_label: batchLabel,
      }));

      const { data, error } = await supabase.from("copies").insert(inserts).select();
      if (error) { console.error("Insert error:", p, error); continue; }
      allCopies = allCopies.concat(data || []);
    }

    if (allCopies.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to generate copies" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ copies: allCopies, batch_label: batchLabel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "rate_limit" ? 429 : msg === "credits" ? 402 : 500;
    return new Response(JSON.stringify({ error: msg === "rate_limit" ? "Limite de requisições." : msg === "credits" ? "Créditos insuficientes." : "Erro interno" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
