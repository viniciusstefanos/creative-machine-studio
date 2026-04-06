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

  try {
    const { asset_id, activation_id, copy_id, format_id } = await req.json();
    if (!asset_id || !activation_id || !copy_id || !format_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch brief, copy, and format
    const [briefRes, copyRes, formatRes] = await Promise.all([
      supabase.from("briefs").select("*").eq("activation_id", activation_id).maybeSingle(),
      supabase.from("copies").select("*").eq("id", copy_id).single(),
      supabase.from("asset_formats").select("*").eq("id", format_id).single(),
    ]);

    const brief = briefRes.data;
    const copy = copyRes.data;
    const format = formatRes.data;

    if (!copy || !format) {
      return new Response(JSON.stringify({ error: "Copy or format not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate HTML creative via Lovable AI
    const htmlPrompt = `You are a creative designer generating an HTML creative piece for a marketing campaign.

Format: ${format.name} (${format.category})
${format.prompt_hint ? `Design hint: ${format.prompt_hint}` : ""}

Copy:
- Hook: ${copy.hook || "N/A"}
- Body: ${copy.body || "N/A"}
- CTA: ${copy.cta || "N/A"}

${brief ? `Brief context:
- Objectives: ${brief.objectives || "N/A"}
- Target audience: ${brief.target_audience || "N/A"}
- Tone of voice: ${brief.tone_of_voice || "N/A"}` : ""}

Generate a single, self-contained HTML document for this creative piece. Requirements:
- Modern, visually striking design with dark theme
- All CSS inline or in a <style> tag
- Responsive layout
- Use the copy text (hook, body, CTA) prominently
- Make the CTA visually distinct (button-like)
- Use gradients, subtle shadows, and modern typography
- Output ONLY the HTML code, no explanation`;

    const htmlResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: htmlPrompt }],
      }),
    });

    if (!htmlResponse.ok) {
      const status = htmlResponse.status;
      const errText = await htmlResponse.text();
      console.error("AI HTML error:", status, errText);
      if (status === 429 || status === 402) {
        await supabase.from("assets").update({ status: "failed" }).eq("id", asset_id);
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded" : "Credits exhausted" }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("HTML generation failed");
    }

    const htmlData = await htmlResponse.json();
    let htmlContent = htmlData.choices?.[0]?.message?.content || "";
    // Strip markdown code fences if present
    htmlContent = htmlContent.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

    // Generate image via Lovable AI
    const imagePrompt = `Create a professional marketing visual for: ${brief?.objectives || copy.hook || "marketing campaign"}. Style: modern, clean, vibrant colors on dark background. ${format.prompt_hint || ""}`;

    let imageUrl = null;
    try {
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
            console.error("Upload error:", uploadError);
          }
        }
      } else {
        console.error("Image generation failed:", imgResponse.status);
      }
    } catch (imgErr) {
      console.error("Image generation error:", imgErr);
      // Continue without image
    }

    // Update asset
    const { error: updateError } = await supabase
      .from("assets")
      .update({
        html_content: htmlContent,
        image_url: imageUrl,
        status: "review",
      })
      .eq("id", asset_id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update asset");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-asset error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
