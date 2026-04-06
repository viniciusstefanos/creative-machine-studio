import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Parse body outside try so asset_id is accessible in catch for cleanup
  let asset_id: string | undefined;
  let body: { asset_id?: string; activation_id?: string; copy_id?: string; format_id?: string };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  asset_id = body.asset_id;
  const { activation_id, copy_id, format_id } = body;

  if (!asset_id || !activation_id || !copy_id || !format_id) {
    return new Response(JSON.stringify({ error: "Missing required fields: asset_id, activation_id, copy_id, format_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch brief, copy, and format in parallel
    const [briefRes, copyRes, formatRes] = await Promise.all([
      supabase.from("briefs").select("*").eq("activation_id", activation_id).maybeSingle(),
      supabase.from("copies").select("*").eq("id", copy_id).single(),
      supabase.from("asset_formats").select("*").eq("id", format_id).single(),
    ]);

    const brief = briefRes.data;
    const copy = copyRes.data;
    const format = formatRes.data;

    if (!copy || !format) {
      await supabase
        .from("assets")
        .update({ status: "rejected", feedback: "Copy ou formato não encontrado." })
        .eq("id", asset_id);
      return new Response(JSON.stringify({ error: "Copy or format not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── 1. Generate HTML creative via Lovable AI ────────────────────────────
    const htmlPrompt = `You are a creative designer generating an HTML creative piece for a marketing agency.

Format: ${format.name} (${format.category})
${format.prompt_hint ? `Design specification: ${format.prompt_hint}` : ""}

Copy content:
- Hook (headline): ${copy.hook || "N/A"}
- Body (supporting text): ${copy.body || "N/A"}
- CTA (call to action): ${copy.cta || "N/A"}

${brief ? `Campaign brief:
- Objectives: ${brief.objectives || "N/A"}
- Target audience: ${brief.target_audience || "N/A"}
- Tone of voice: ${brief.tone_of_voice || "N/A"}
- Extra context: ${brief.extra_context || "N/A"}` : ""}

Generate a self-contained HTML document for this creative piece. Requirements:
- Dark, modern aesthetic — background #0A0E14, accent color #00C9A7 (teal)
- All CSS in a <style> block (no external stylesheets, no CDN links)
- Use Google Fonts via @import only: Syne for headlines, DM Sans for body text
- Display the hook as the main headline (bold, large)
- Display the body as supporting text (smaller, lighter weight)
- Display the CTA as a prominent teal button
- Layout should feel like a polished social media ad
- Add subtle gradient background and card shadows
- Output ONLY the complete HTML document, no markdown, no explanation`;

    const htmlResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: htmlPrompt }],
        temperature: 0.7,
      }),
    });

    if (!htmlResponse.ok) {
      const httpStatus = htmlResponse.status;
      const errText = await htmlResponse.text();
      console.error("AI HTML error:", httpStatus, errText);

      const feedbackMsg =
        httpStatus === 429
          ? "Limite de requisições atingido. Tente novamente em instantes."
          : httpStatus === 402
          ? "Créditos insuficientes. Contate o administrador."
          : "Falha na geração via IA.";

      await supabase
        .from("assets")
        .update({ status: "rejected", feedback: feedbackMsg })
        .eq("id", asset_id);

      return new Response(JSON.stringify({ error: feedbackMsg }), {
        status: httpStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const htmlData = await htmlResponse.json();
    let htmlContent: string = htmlData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if the model wrapped the output
    htmlContent = htmlContent
      .replace(/^```html?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // ─── 2. Generate image via Lovable AI (optional — continues without it) ──
    let imageUrl: string | null = null;
    try {
      const imagePrompt = [
        `Professional marketing visual for: ${brief?.objectives || copy.hook || "marketing campaign"}.`,
        `Style: modern, clean, dark background, teal (#00C9A7) accents.`,
        format.prompt_hint ? `Format context: ${format.prompt_hint}` : "",
        copy.hook ? `Headline theme: ${copy.hook}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (imgResponse.ok) {
        const imgData = await imgResponse.json();
        const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (base64Url) {
          const base64Data = base64Url.split(",")[1];
          const imageBytes = decode(base64Data);
          const filePath = `generated/${asset_id}.png`;
          const { error: uploadError } = await supabase.storage
            .from("assets")
            .upload(filePath, imageBytes, { contentType: "image/png", upsert: true });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("assets").getPublicUrl(filePath);
            imageUrl = urlData.publicUrl;
          } else {
            console.error("Storage upload error:", uploadError.message);
          }
        }
      } else {
        console.warn("Image generation skipped:", imgResponse.status);
      }
    } catch (imgErr) {
      // Non-fatal: image is optional
      console.error("Image generation error (non-fatal):", imgErr);
    }

    // ─── 3. Update asset with generated content ──────────────────────────────
    const { error: updateError } = await supabase
      .from("assets")
      .update({
        html_content: htmlContent,
        image_url: imageUrl,
        status: "review",
      })
      .eq("id", asset_id);

    if (updateError) {
      console.error("Asset update error:", updateError);
      throw new Error(`Failed to update asset: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true, has_image: imageUrl !== null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-asset unhandled error:", e);

    // Mark asset as rejected so it doesn't stay stuck in 'generating'
    if (asset_id) {
      await supabase
        .from("assets")
        .update({
          status: "rejected",
          feedback: "Erro interno na geração. Tente novamente.",
        })
        .eq("id", asset_id)
        .catch((err) => console.error("Cleanup update failed:", err));
    }

    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
