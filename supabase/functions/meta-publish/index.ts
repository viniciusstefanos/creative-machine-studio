const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
    if (!META_ACCESS_TOKEN) {
      throw new Error("META_ACCESS_TOKEN not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, scheduled_post_id, instagram_page_id, page_access_token, image_url, caption, images } = await req.json();

    // Use page-specific token if available, otherwise use main token
    const token = page_access_token || META_ACCESS_TOKEN;

    if (action === "publish_post") {
      // Step 1: Create media container
      const containerRes = await fetch(
        `${META_GRAPH_URL}/${instagram_page_id}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url,
            caption,
            access_token: token,
          }),
        }
      );
      const containerData = await containerRes.json();
      if (!containerRes.ok) {
        throw new Error(`Meta container creation failed [${containerRes.status}]: ${JSON.stringify(containerData)}`);
      }

      const containerId = containerData.id;

      // Step 2: Publish the container
      const publishRes = await fetch(
        `${META_GRAPH_URL}/${instagram_page_id}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: token,
          }),
        }
      );
      const publishData = await publishRes.json();
      if (!publishRes.ok) {
        throw new Error(`Meta publish failed [${publishRes.status}]: ${JSON.stringify(publishData)}`);
      }

      // Update scheduled_post status
      if (scheduled_post_id) {
        await supabase
          .from("scheduled_posts")
          .update({
            status: "published",
            platform_post_id: publishData.id,
            published_at: new Date().toISOString(),
          })
          .eq("id", scheduled_post_id);
      }

      return new Response(JSON.stringify({ success: true, post_id: publishData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "publish_carousel") {
      const { images, caption: carouselCaption } = await req.json();
      
      // Create containers for each image
      const containerIds = [];
      for (const img of images) {
        const res = await fetch(`${META_GRAPH_URL}/${instagram_page_id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: img,
            is_carousel_item: true,
            access_token: token,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`Carousel item failed: ${JSON.stringify(data)}`);
        containerIds.push(data.id);
      }

      // Create carousel container
      const carouselRes = await fetch(`${META_GRAPH_URL}/${instagram_page_id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          children: containerIds,
          caption: carouselCaption,
          access_token: token,
        }),
      });
      const carouselData = await carouselRes.json();
      if (!carouselRes.ok) throw new Error(`Carousel creation failed: ${JSON.stringify(carouselData)}`);

      // Publish
      const publishRes = await fetch(`${META_GRAPH_URL}/${instagram_page_id}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: carouselData.id, access_token: token }),
      });
      const publishData = await publishRes.json();
      if (!publishRes.ok) throw new Error(`Carousel publish failed: ${JSON.stringify(publishData)}`);

      return new Response(JSON.stringify({ success: true, post_id: publishData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token / get pages
    if (action === "get_pages") {
      const res = await fetch(`${META_GRAPH_URL}/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Get pages failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("meta-publish error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
