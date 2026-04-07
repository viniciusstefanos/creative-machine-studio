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
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { render_id, action, html_content, image_prompt, use_claude, asset_id } = body;

  if (!render_id || !action) {
    return new Response(JSON.stringify({ error: "render_id and action required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ─── ACTION: save_html — direct HTML text edit ─────────────
    if (action === "save_html") {
      if (!html_content) {
        return new Response(JSON.stringify({ error: "html_content required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("asset_template_renders").update({
        html_content, png_url: null,
      }).eq("id", render_id);

      // Also update asset if single slide
      if (asset_id) {
        const { data: renders } = await supabase.from("asset_template_renders")
          .select("id").eq("asset_id", asset_id);
        if (renders && renders.length === 1) {
          await supabase.from("assets").update({ html_content }).eq("id", asset_id);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: refine_html — AI refine HTML with instruction ─
    if (action === "refine_html") {
      const { data: render } = await supabase.from("asset_template_renders")
        .select("html_content").eq("id", render_id).single();
      if (!render?.html_content) {
        return new Response(JSON.stringify({ error: "No HTML to refine" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const instruction = html_content || "Melhore o design";
      const systemPrompt = `Você é um designer visual expert. Receba um HTML de peça para Instagram e uma instrução de edição. Aplique APENAS a edição solicitada, mantendo o restante intacto. Retorne SOMENTE o HTML final, sem markdown, sem explicação.`;
      const userPrompt = `HTML atual:\n\`\`\`html\n${render.html_content}\n\`\`\`\n\nInstrução de edição: ${instruction}`;

      const useClaude = !!use_claude;
      let result: string;

      if (useClaude && anthropicKey) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", max_tokens: 8192,
            system: systemPrompt, messages: [{ role: "user", content: userPrompt }],
          }),
        });
        if (!res.ok) throw new Error("ai_failed");
        const data = await res.json();
        result = data.content?.[0]?.text || "";
      } else {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          }),
        });
        if (!res.ok) throw new Error("ai_failed");
        const data = await res.json();
        result = data.choices?.[0]?.message?.content || "";
      }

      const cleanHtml = result.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();

      await supabase.from("asset_template_renders").update({
        html_content: cleanHtml, png_url: null,
      }).eq("id", render_id);

      if (asset_id) {
        const { data: renders } = await supabase.from("asset_template_renders")
          .select("id").eq("asset_id", asset_id);
        if (renders && renders.length === 1) {
          await supabase.from("assets").update({ html_content: cleanHtml }).eq("id", asset_id);
        }
      }

      return new Response(JSON.stringify({ success: true, html_content: cleanHtml }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: regenerate_image — new image from prompt ──────
    if (action === "regenerate_image") {
      if (!image_prompt) {
        return new Response(JSON.stringify({ error: "image_prompt required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: `Generate an image: ${image_prompt}` }],
          modalities: ["image", "text"],
        }),
      });
      if (!res.ok) throw new Error("image_gen_failed");
      const data = await res.json();
      const choice = data.choices?.[0];

      let base64Data: string | null = null;
      const imgUrl = choice?.message?.images?.[0]?.image_url?.url;
      if (imgUrl) base64Data = imgUrl.includes(",") ? imgUrl.split(",")[1] : imgUrl;

      if (!base64Data && Array.isArray(choice?.message?.content)) {
        for (const part of choice.message.content) {
          if (part.type === "image_url" && part.image_url?.url) {
            const url = part.image_url.url;
            base64Data = url.includes(",") ? url.split(",")[1] : url;
            break;
          }
          if (part.type === "image" && part.data) { base64Data = part.data; break; }
        }
      }
      if (!base64Data && Array.isArray(choice?.message?.parts)) {
        for (const p of choice.message.parts) {
          if (p.inline_data?.data) { base64Data = p.inline_data.data; break; }
        }
      }

      if (!base64Data) {
        return new Response(JSON.stringify({ error: "Falha na geração de imagem" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imageBytes = decode(base64Data);
      const effectiveAssetId = asset_id || render_id;
      const filePath = `generated/${effectiveAssetId}/${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage
        .from("assets")
        .upload(filePath, imageBytes, { contentType: "image/png", upsert: true });
      if (uploadErr) throw new Error("upload_failed");
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(filePath);
      const newImageUrl = urlData.publicUrl;

      await supabase.from("asset_template_renders").update({ image_url: newImageUrl }).eq("id", render_id);

      if (asset_id) {
        const { data: renders } = await supabase.from("asset_template_renders")
          .select("id").eq("asset_id", asset_id);
        if (renders && renders.length === 1) {
          await supabase.from("assets").update({ image_url: newImageUrl }).eq("id", asset_id);
        }
      }

      return new Response(JSON.stringify({ success: true, image_url: newImageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("edit-asset-render error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
