import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore - JSZip for DOCX parsing
import JSZip from "https://esm.sh/jszip@3.10.1";
import { BRIEF_SYSTEM_PROMPT, DEEP_EXTRACTION_SCHEMA } from "../_shared/brief-system-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function stripXml(xml: string): string {
  return xml
    .replace(/<w:p[^>]*\/>/gi, "\n")
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<w:tab[^>]*\/?>/gi, "\t")
    .replace(/<w:br[^>]*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractTextFromDocx(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const docXml = zip.file("word/document.xml");
  if (!docXml) throw new Error("Invalid DOCX: word/document.xml not found");
  const xmlContent = await docXml.async("string");
  return stripXml(xmlContent);
}

async function extractText(blob: Blob, filePath: string): Promise<string> {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (ext === "docx") return await extractTextFromDocx(blob);
  if (ext === "txt" || ext === "md") return await blob.text();
  if (ext === "pdf") {
    const rawText = await blob.text();
    const printableRatio = (rawText.match(/[\x20-\x7E\xA0-\xFF]/g) || []).length / rawText.length;
    if (printableRatio > 0.5) return rawText.slice(0, 50000);
    return "[PDF com conteúdo não-textual. Não foi possível extrair texto automaticamente.]";
  }
  return await blob.text();
}

const EXTRACTION_SYSTEM = `${BRIEF_SYSTEM_PROMPT}

Você é um assistente especialista em extrair informações DETALHADAS de documentos de marketing/branding.

Analise o documento INTEGRALMENTE e extraia TODOS os campos possíveis com a MÁXIMA profundidade.
- Para cada campo, extraia TODAS as informações relevantes do documento, não apenas um resumo.
- Para produtos/serviços, liste TODOS mencionados com nome, descrição, preço e diferenciais.
- Para público-alvo, capture dados demográficos, psicográficos, dores, desejos e objeções.
- Para tom de voz, identifique formalidade, personalidade, palavras recomendadas e proibidas.
- Para visual, extraia cores exatas (hex quando disponível), fontes, estilo, dos e don'ts.
- Para proof points, capture TODOS os números, prêmios, certificações e depoimentos reais.
- Para restrições, liste TODOS os termos proibidos, temas sensíveis e restrições legais.

Se o documento NÃO for um brief/guia de marketing, retorne detected_category="geral" e descreva em document_summary.
NUNCA invente informações que não estejam no documento.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { file_path } = await req.json();
    if (!file_path) throw new Error("file_path is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: fileData, error: downloadError } = await supabase.storage.from("briefs").download(file_path);
    if (downloadError || !fileData) throw new Error("Failed to download file: " + downloadError?.message);

    const text = await extractText(fileData, file_path);
    console.log("Extracted text length:", text.length, "chars");

    if (text.length < 20) {
      return new Response(JSON.stringify({ error: "Não foi possível extrair texto suficiente do arquivo." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send up to 30K chars to AI
    const textForAI = text.slice(0, 30000);

    // Try Lovable AI first (preferred), fallback to Anthropic
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    let extracted: any = {};

    if (LOVABLE_API_KEY) {
      extracted = await extractWithLovableAI(textForAI, LOVABLE_API_KEY);
    } else if (ANTHROPIC_API_KEY) {
      extracted = await extractWithClaude(textForAI, ANTHROPIC_API_KEY);
    } else {
      throw new Error("No AI key configured");
    }

    return new Response(JSON.stringify({ extracted, raw_text: text.slice(0, 50000) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-brief error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "rate_limit" ? 429 : msg === "credits" ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function extractWithLovableAI(text: string, apiKey: string): Promise<any> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM },
        { role: "user", content: `Analise este documento INTEGRALMENTE e extraia TODOS os campos com máxima profundidade:\n\n${text}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_brief_deep",
          description: "Extract all structured fields from a marketing/branding document with maximum depth",
          parameters: DEEP_EXTRACTION_SCHEMA,
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_brief_deep" } },
    }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw new Error("rate_limit");
    if (status === 402) throw new Error("credits");
    throw new Error("AI error: " + status);
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  return toolCall ? JSON.parse(toolCall.function.arguments) : {};
}

async function extractWithClaude(text: string, apiKey: string): Promise<any> {
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
      system: EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: `Analise este documento INTEGRALMENTE e extraia TODOS os campos com máxima profundidade. Responda APENAS com JSON válido seguindo o schema.\n\n${text}` }],
    }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw new Error("rate_limit");
    throw new Error("AI error");
  }

  const data = await res.json();
  const content = data.content?.[0]?.text || "{}";
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    if (!jsonStr.startsWith("{")) {
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }
    return JSON.parse(jsonStr);
  } catch {
    console.error("Failed to parse Claude response:", content);
    return {};
  }
}
