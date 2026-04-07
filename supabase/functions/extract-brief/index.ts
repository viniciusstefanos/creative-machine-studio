import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore - JSZip for DOCX parsing
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Strip XML tags and normalize whitespace */
function stripXml(xml: string): string {
  return xml
    .replace(/<w:p[^>]*\/>/gi, "\n")           // self-closing paragraphs → newline
    .replace(/<\/w:p>/gi, "\n")                  // end of paragraph → newline
    .replace(/<w:tab[^>]*\/?>/gi, "\t")          // tabs
    .replace(/<w:br[^>]*\/?>/gi, "\n")           // line breaks
    .replace(/<[^>]+>/g, "")                     // strip all remaining XML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")                  // collapse excessive newlines
    .trim();
}

/** Extract plain text from a DOCX file (which is a ZIP containing word/document.xml) */
async function extractTextFromDocx(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const docXml = zip.file("word/document.xml");
  if (!docXml) throw new Error("Invalid DOCX: word/document.xml not found");
  const xmlContent = await docXml.async("string");
  return stripXml(xmlContent);
}

/** Extract text from uploaded file based on extension */
async function extractText(blob: Blob, filePath: string): Promise<string> {
  const ext = filePath.split(".").pop()?.toLowerCase();

  if (ext === "docx") {
    return await extractTextFromDocx(blob);
  }

  if (ext === "txt" || ext === "md") {
    return await blob.text();
  }

  if (ext === "pdf") {
    // For PDF, send raw text extraction attempt — may be lossy but better than nothing
    const rawText = await blob.text();
    // Check if it looks like readable text (PDFs often have some extractable text)
    const printableRatio = (rawText.match(/[\x20-\x7E\xA0-\xFF]/g) || []).length / rawText.length;
    if (printableRatio > 0.5) {
      return rawText.slice(0, 20000);
    }
    return "[PDF com conteúdo não-textual. Não foi possível extrair texto automaticamente.]";
  }

  // Fallback: try reading as text
  return await blob.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { file_path } = await req.json();
    if (!file_path) throw new Error("file_path is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage.from("briefs").download(file_path);
    if (downloadError || !fileData) throw new Error("Failed to download file: " + downloadError?.message);

    // Extract text properly based on file type
    const text = await extractText(fileData, file_path);
    console.log("Extracted text length:", text.length, "chars. First 200:", text.slice(0, 200));

    if (text.length < 20) {
      return new Response(JSON.stringify({ error: "Não foi possível extrair texto suficiente do arquivo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      // Fallback to Lovable AI
      return await extractWithLovableAI(text, corsHeaders);
    }

    // Use Claude for extraction
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
         system: `Você é um assistente que extrai informações de briefing de marketing de documentos.
Analise o documento e extraia APENAS informações que REALMENTE existam no texto.
Se o documento NÃO for um brief de marketing (ex: é um guia de design, documento técnico, etc.), 
retorne os campos vazios e coloque no extra_context um resumo do que o documento realmente contém.
NUNCA invente informações. Se um campo não está presente no documento, retorne string vazia.

Classifique o documento em UMA categoria:
- "identidade_visual" = guia de marca, manual de identidade, brand book, paleta de cores, tipografia
- "produto" = ficha técnica, cardápio, catálogo, especificações de produto
- "tom_de_voz" = guia de tom, voz da marca, diretrizes de comunicação
- "publico_alvo" = pesquisa de público, persona, segmentação, dados demográficos
- "contexto" = análise de mercado, concorrência, tendências, cenário
- "referencias" = moodboard, referências visuais, benchmarks, cases
- "briefing" = brief completo de campanha, ativação, projeto
- "geral" = outros documentos que não se encaixam nas categorias acima

Responda APENAS com JSON válido, sem markdown:
{"tone_of_voice":"","target_audience":"","objectives":"","extra_context":"","references_urls":[],"detected_category":""}`,
        messages: [
          { role: "user", content: `Extraia campos de brief deste documento:\n\n${text.slice(0, 12000)}` },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude error:", res.status, errText);
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI error");
    }

    const aiData = await res.json();
    const content = aiData.content?.[0]?.text || "{}";

    let extracted;
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      if (!jsonStr.startsWith("{")) {
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) jsonStr = objMatch[0];
      }
      extracted = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      extracted = {};
    }

    return new Response(JSON.stringify({ extracted, raw_text: text.slice(0, 30000) }), {
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

async function extractWithLovableAI(text: string, corsHeaders: Record<string, string>) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("No AI key configured");

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
          content: `Você extrai informações de briefing de marketing de documentos.
Se o documento NÃO for um brief de marketing, retorne campos vazios e descreva o conteúdo real em extra_context.
NUNCA invente informações.`,
        },
        { role: "user", content: `Extraia campos de brief:\n\n${text.slice(0, 15000)}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_brief",
            description: "Extract structured brief fields from document",
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
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    throw new Error("AI error");
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  const extracted = toolCall ? JSON.parse(toolCall.function.arguments) : {};

  return new Response(JSON.stringify({ extracted, raw_text: text.slice(0, 30000) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
