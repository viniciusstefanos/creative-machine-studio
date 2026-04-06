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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { asset_id, template_id, copy_id, activation_id, render_config } = body;

  if (!asset_id || !template_id || !copy_id || !activation_id) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch template, copy, brief in parallel
    const [templateRes, copyRes, briefRes] = await Promise.all([
      supabase.from("asset_templates").select("*").eq("id", template_id).single(),
      supabase.from("copies").select("*").eq("id", copy_id).single(),
      supabase.from("briefs").select("*").eq("activation_id", activation_id).maybeSingle(),
    ]);

    const template = templateRes.data;
    const copy = copyRes.data;
    const brief = briefRes.data;

    if (!template || !copy) {
      await supabase.from("assets").update({ status: "rejected", feedback: "Template ou copy não encontrado." }).eq("id", asset_id);
      return new Response(JSON.stringify({ error: "Template or copy not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = render_config || {};
    const context = {
      hook: copy.hook || "",
      body: copy.body || "",
      cta: copy.cta || "",
      full_copy: copy.full_copy || `${copy.hook || ""}\n${copy.body || ""}\n${copy.cta || ""}`,
      objectives: brief?.objectives || "",
      target_audience: brief?.target_audience || "",
      tone_of_voice: brief?.tone_of_voice || "",
      ...config,
    };

    // Helper: fill template placeholders
    const fillTemplate = (tpl: string, ctx: Record<string, any>): string => {
      return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] || "");
    };

    // Helper: call AI for text/HTML
    const callAI = async (systemPrompt: string, userPrompt: string): Promise<string> => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        const status = res.status;
        const errText = await res.text();
        console.error("AI error:", status, errText);
        throw new Error(status === 429 ? "rate_limit" : status === 402 ? "credits" : "ai_failed");
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    };

    // Helper: generate image
    const generateImage = async (prompt: string): Promise<string | null> => {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });
        if (!res.ok) { console.warn("Image gen failed:", res.status); return null; }
        const data = await res.json();
        const base64Url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!base64Url) return null;
        const base64Data = base64Url.split(",")[1];
        const imageBytes = decode(base64Data);
        const filePath = `generated/${asset_id}/${Date.now()}.png`;
        const { error: uploadErr } = await supabase.storage.from("assets").upload(filePath, imageBytes, { contentType: "image/png", upsert: true });
        if (uploadErr) { console.error("Upload error:", uploadErr); return null; }
        const { data: urlData } = supabase.storage.from("assets").getPublicUrl(filePath);
        return urlData.publicUrl;
      } catch (e) {
        console.error("Image gen error:", e);
        return null;
      }
    };

    // Helper: save render
    const saveRender = async (slideIndex: number, fields: Record<string, any>) => {
      await supabase.from("asset_template_renders").insert({
        asset_id,
        slide_index: slideIndex,
        status: "ready",
        ...fields,
      });
    };

    // Split copy into slides for carousels
    const splitCopyIntoSlides = (minSlides: number): string[] => {
      const parts: string[] = [];
      if (copy.hook) parts.push(copy.hook);
      if (copy.body) {
        const sentences = copy.body.split(/[.!?\n]+/).map((s: string) => s.trim()).filter(Boolean);
        parts.push(...sentences);
      }
      if (copy.cta) parts.push(copy.cta);
      // Ensure minimum slides
      while (parts.length < minSlides) parts.push(copy.body || copy.hook || "");
      return parts;
    };

    // ─── Branch by generation_type ────────────────────────────────
    if (template.generation_type === "html_only") {
      const carouselInstruction = template.category === "carousel"
        ? `\n\nDivida o copy em ${template.slides_count_min} a ${template.slides_count_max} slides.\nSlide 1: sempre o GANCHO.\nSlides do meio: pontos do CORPO — um por slide.\nSlide final: sempre o CTA.\nRetorne APENAS um array JSON: [{"slide_index": 0, "html": "..."}]. Zero markdown.`
        : "";

      const userPrompt = `Copy:\n- Hook: ${context.hook}\n- Body: ${context.body}\n- CTA: ${context.cta}\n\nDimensões: ${template.width_px}x${template.height_px}px\nConfig: ${JSON.stringify(config)}`;

      const rawContent = await callAI(
        (template.system_prompt || "") + carouselInstruction,
        userPrompt
      );

      if (template.category === "carousel") {
        // Parse JSON array
        const cleaned = rawContent.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
        let slides: Array<{ slide_index: number; html: string }>;
        try {
          slides = JSON.parse(cleaned);
        } catch {
          // Fallback: treat as single slide
          slides = [{ slide_index: 0, html: cleaned }];
        }
        for (const slide of slides) {
          await saveRender(slide.slide_index, { html_content: slide.html });
        }
      } else {
        const html = rawContent.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();
        await saveRender(0, { html_content: html });
        // Also save on asset for backward compat
        await supabase.from("assets").update({ html_content: html }).eq("id", asset_id);
      }

    } else if (template.generation_type === "image_only") {
      const slideParts = splitCopyIntoSlides(template.slides_count_min || 1);
      const maxSlides = Math.min(slideParts.length, template.slides_count_max || 5);

      for (let i = 0; i < maxSlides; i++) {
        const prompt = fillTemplate(template.image_prompt_template || "", {
          ...context,
          slide_content: slideParts[i],
        });
        const imageUrl = await generateImage(prompt);
        await saveRender(i, { image_url: imageUrl });
        // For single image, also save on asset
        if (maxSlides === 1 && imageUrl) {
          await supabase.from("assets").update({ image_url: imageUrl }).eq("id", asset_id);
        }
      }

    } else if (template.generation_type === "html_and_image") {
      // Step 1: Generate background image
      const imgPrompt = fillTemplate(template.image_prompt_template || "", context);
      const bgImageUrl = await generateImage(imgPrompt);

      // Step 2: Generate HTML overlay
      const overlayPrompt = `Copy:\n- Hook: ${context.hook}\n- Body: ${context.body}\n- CTA: ${context.cta}\n\nDimensões: ${template.width_px}x${template.height_px}px\nImagem de fundo: ${bgImageUrl || "não disponível"}\nConfig: ${JSON.stringify(config)}`;

      const rawHtml = await callAI(template.system_prompt || "", overlayPrompt);
      const html = rawHtml.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();

      await saveRender(0, { html_content: html, image_url: bgImageUrl });
      await supabase.from("assets").update({ html_content: html, image_url: bgImageUrl }).eq("id", asset_id);
    }

    // Mark asset as ready for review
    await supabase.from("assets").update({ status: "review" }).eq("id", asset_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-asset-from-template error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const feedbackMsg = msg === "rate_limit" ? "Limite de requisições. Tente novamente." :
      msg === "credits" ? "Créditos insuficientes." : "Erro na geração. Tente novamente.";

    await supabase.from("assets").update({ status: "rejected", feedback: feedbackMsg }).eq("id", asset_id).catch(console.error);

    return new Response(JSON.stringify({ error: feedbackMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
