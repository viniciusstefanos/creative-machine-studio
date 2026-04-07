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

    const body = await req.json();
    const { action } = body;
    const token = body.page_access_token || META_ACCESS_TOKEN;

    // Get ad accounts
    if (action === "get_ad_accounts") {
      const res = await fetch(`${META_GRAPH_URL}/me/adaccounts?fields=id,name,account_status,currency&access_token=${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Get ad accounts failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create campaign
    if (action === "create_campaign") {
      const { ad_account_id, name, objective, status: campStatus, daily_budget, activation_id } = body;

      const res = await fetch(`${META_GRAPH_URL}/${ad_account_id}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          objective: objective || "OUTCOME_ENGAGEMENT",
          status: campStatus || "PAUSED",
          special_ad_categories: [],
          access_token: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create campaign failed [${res.status}]: ${JSON.stringify(data)}`);

      // Save to DB
      if (activation_id) {
        await supabase.from("ad_campaigns").insert({
          activation_id,
          platform: "meta",
          name,
          objective: objective || "OUTCOME_ENGAGEMENT",
          budget: daily_budget || null,
          status: campStatus || "paused",
          platform_campaign_id: data.id,
        });
      }

      return new Response(JSON.stringify({ success: true, campaign_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create ad set
    if (action === "create_adset") {
      const { ad_account_id, campaign_id, name, daily_budget: budget, targeting, optimization_goal } = body;

      const res = await fetch(`${META_GRAPH_URL}/${ad_account_id}/adsets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          campaign_id,
          daily_budget: budget || 2000, // in cents
          billing_event: "IMPRESSIONS",
          optimization_goal: optimization_goal || "REACH",
          targeting: targeting || { geo_locations: { countries: ["BR"] } },
          status: "PAUSED",
          access_token: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create adset failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify({ success: true, adset_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create ad creative + ad
    if (action === "create_ad") {
      const { ad_account_id, adset_id, name, image_url, caption, link, instagram_page_id } = body;

      // Upload image to Meta
      const imgRes = await fetch(`${META_GRAPH_URL}/${ad_account_id}/adimages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: image_url, access_token: token }),
      });
      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error(`Upload ad image failed [${imgRes.status}]: ${JSON.stringify(imgData)}`);

      const imageHash = Object.values(imgData.images as Record<string, { hash: string }>)[0]?.hash;

      // Create creative
      const creativeRes = await fetch(`${META_GRAPH_URL}/${ad_account_id}/adcreatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Creative - ${name}`,
          object_story_spec: {
            page_id: instagram_page_id,
            instagram_actor_id: instagram_page_id,
            link_data: {
              image_hash: imageHash,
              message: caption,
              link: link || "https://example.com",
            },
          },
          access_token: token,
        }),
      });
      const creativeData = await creativeRes.json();
      if (!creativeRes.ok) throw new Error(`Create creative failed [${creativeRes.status}]: ${JSON.stringify(creativeData)}`);

      // Create ad
      const adRes = await fetch(`${META_GRAPH_URL}/${ad_account_id}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          adset_id,
          creative: { creative_id: creativeData.id },
          status: "PAUSED",
          access_token: token,
        }),
      });
      const adData = await adRes.json();
      if (!adRes.ok) throw new Error(`Create ad failed [${adRes.status}]: ${JSON.stringify(adData)}`);

      return new Response(JSON.stringify({ success: true, ad_id: adData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("meta-ads error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
