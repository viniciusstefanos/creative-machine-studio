const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "jsr:@supabase/supabase-js@2";

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function postToMeta(path: string, params: Record<string, string | undefined>) {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const normalized = value?.trim();
    if (normalized) body.set(key, normalized);
  }

  return fetch(`${META_GRAPH_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

// Poll container status until FINISHED or timeout
async function waitForContainer(containerId: string, token: string, maxAttempts = 15): Promise<void> {
  const normalizedContainerId = containerId.trim();
  const normalizedToken = token.trim();

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${META_GRAPH_URL}/${normalizedContainerId}?fields=status_code,status&access_token=${encodeURIComponent(normalizedToken)}`
    );
    const data = await parseJsonResponse(res);
    const statusCode = String(data.status_code || data.status || "").toUpperCase();

    console.log(`Container ${normalizedContainerId} status: ${statusCode || "UNKNOWN"} (attempt ${i + 1})`);

    if (!res.ok || data.error) {
      throw new Error(`Container status check failed [${res.status}]: ${JSON.stringify(data)}`);
    }

    if (statusCode === "FINISHED" || statusCode === "PUBLISHED") {
      await sleep(1500);
      return;
    }

    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new Error(`Container processing failed: ${JSON.stringify(data)}`);
    }

    await sleep(2000);
  }
  throw new Error("Container not ready after polling timeout");
}

async function publishContainerWithRetry(instagramPageId: string, containerId: string, token: string, maxAttempts = 10) {
  const normalizedPageId = instagramPageId.trim();
  const normalizedContainerId = containerId.trim();
  const normalizedToken = token.trim();

  for (let i = 0; i < maxAttempts; i++) {
    const publishRes = await postToMeta(`${normalizedPageId}/media_publish`, {
      creation_id: normalizedContainerId,
      access_token: normalizedToken,
    });
    const publishData = await parseJsonResponse(publishRes);

    if (publishRes.ok) return publishData;

    const errorCode = publishData?.error?.code;
    const errorSubcode = publishData?.error?.error_subcode;
    const errorMessage = JSON.stringify(publishData?.error || publishData);
    const isMediaStillProcessing = errorCode === 9007 || errorSubcode === 2207027;

    if (!isMediaStillProcessing || i === maxAttempts - 1) {
      throw new Error(`Meta publish failed [${publishRes.status}]: ${JSON.stringify(publishData)}`);
    }

    console.log(`Container ${normalizedContainerId} still processing during publish attempt ${i + 1}: ${errorMessage}`);
    await sleep(3000);
    await waitForContainer(normalizedContainerId, normalizedToken, 10);
  }

  throw new Error("Meta publish retry limit reached");
}

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

    const token = (page_access_token || META_ACCESS_TOKEN)?.trim();
    const instagramPageId = instagram_page_id?.trim();

    if (!token) {
      throw new Error("Meta access token não configurado");
    }

    if (!instagramPageId && action !== "get_pages") {
      throw new Error("instagram_page_id é obrigatório");
    }

    if (action === "publish_post") {
      const containerRes = await postToMeta(`${instagramPageId}/media`, {
        image_url,
        caption,
        access_token: token,
      });
      const containerData = await parseJsonResponse(containerRes);
      if (!containerRes.ok) {
        throw new Error(`Meta container creation failed [${containerRes.status}]: ${JSON.stringify(containerData)}`);
      }

      const containerId = containerData.id;

      // Wait for container to be ready
      await waitForContainer(containerId, token);

      const publishData = await publishContainerWithRetry(instagramPageId, containerId, token);

      if (scheduled_post_id) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "published", platform_post_id: publishData.id, published_at: new Date().toISOString() })
          .eq("id", scheduled_post_id);
      }

      return new Response(JSON.stringify({ success: true, post_id: publishData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "publish_carousel") {
      const carouselImages = images || [];
      const carouselCaption = caption || "";

      const containerIds = [];
      for (const img of carouselImages) {
        const res = await postToMeta(`${instagramPageId}/media`, {
          image_url: img,
          is_carousel_item: "true",
          access_token: token,
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) throw new Error(`Carousel item failed: ${JSON.stringify(data)}`);
        containerIds.push(data.id);
      }

      // Wait for all carousel items to be ready
      for (const cid of containerIds) {
        await waitForContainer(cid, token);
      }

      const carouselRes = await postToMeta(`${instagramPageId}/media`, {
        media_type: "CAROUSEL",
        children: containerIds.join(","),
        caption: carouselCaption,
        access_token: token,
      });
      const carouselData = await parseJsonResponse(carouselRes);
      if (!carouselRes.ok) throw new Error(`Carousel creation failed: ${JSON.stringify(carouselData)}`);

      // Wait for carousel container too
      await waitForContainer(carouselData.id, token);

      const publishData = await publishContainerWithRetry(instagramPageId, carouselData.id, token);

      if (scheduled_post_id) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "published", platform_post_id: publishData.id, published_at: new Date().toISOString() })
          .eq("id", scheduled_post_id);
      }

      return new Response(JSON.stringify({ success: true, post_id: publishData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_pages") {
      const res = await fetch(`${META_GRAPH_URL}/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(token)}`);
      const data = await parseJsonResponse(res);
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
