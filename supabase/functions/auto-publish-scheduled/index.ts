const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "jsr:@supabase/supabase-js@2";

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    if (!META_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "META_ACCESS_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find posts that are due
    const { data: posts, error: fetchErr } = await supabase
      .from("scheduled_posts")
      .select("*, assets(image_url, copy_id, activation_id)")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(10);

    if (fetchErr) throw fetchErr;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ published: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let publishedCount = 0;

    for (const post of posts) {
      try {
        // Get client meta account
        const { data: act } = await supabase
          .from("activations")
          .select("client_id")
          .eq("id", post.activation_id)
          .single();
        if (!act?.client_id) continue;

        const { data: meta } = await supabase
          .from("client_meta_accounts")
          .select("*")
          .eq("client_id", act.client_id)
          .maybeSingle();
        if (!meta?.instagram_page_id) continue;

        const token = meta.page_access_token || META_ACCESS_TOKEN;
        const caption = post.caption || "";

        // Try to get rendered PNG first, fallback to raw image_url
        let imageUrl = post.assets?.image_url;
        if (post.asset_id) {
          const { data: renders } = await supabase
            .from("asset_template_renders")
            .select("png_url, image_url")
            .eq("asset_id", post.asset_id)
            .order("slide_index", { ascending: true })
            .limit(1);
          if (renders?.[0]?.png_url) {
            imageUrl = renders[0].png_url;
          }
        }
        if (!imageUrl) continue;

        // Create media container
        const containerRes = await fetch(`${META_GRAPH_URL}/${meta.instagram_page_id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
        });
        const containerData = await containerRes.json();
        if (!containerRes.ok) {
          console.error(`Container failed for post ${post.id}:`, containerData);
          await supabase.from("scheduled_posts").update({ status: "failed" }).eq("id", post.id);
          continue;
        }

        // Publish
        const publishRes = await fetch(`${META_GRAPH_URL}/${meta.instagram_page_id}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
        });
        const publishData = await publishRes.json();
        if (!publishRes.ok) {
          console.error(`Publish failed for post ${post.id}:`, publishData);
          await supabase.from("scheduled_posts").update({ status: "failed" }).eq("id", post.id);
          continue;
        }

        await supabase.from("scheduled_posts").update({
          status: "published",
          platform_post_id: publishData.id,
          published_at: new Date().toISOString(),
        }).eq("id", post.id);

        publishedCount++;
      } catch (e) {
        console.error(`Error publishing post ${post.id}:`, e);
        await supabase.from("scheduled_posts").update({ status: "failed" }).eq("id", post.id);
      }
    }

    return new Response(JSON.stringify({ published: publishedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("auto-publish error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
