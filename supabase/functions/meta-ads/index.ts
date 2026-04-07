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

    // Ensure ad_account_id has act_ prefix
    const ensureActPrefix = (id: string | undefined) => {
      if (!id) return id;
      return id.startsWith("act_") ? id : `act_${id}`;
    };

    // ─── Get ad accounts ───
    if (action === "get_ad_accounts") {
      const res = await fetch(`${META_GRAPH_URL}/me/adaccounts?fields=id,name,account_status,currency&access_token=${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Get ad accounts failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Create campaign ───
    if (action === "create_campaign") {
      const { name, objective, status: campStatus, daily_budget, activation_id } = body;
      const ad_account_id = ensureActPrefix(body.ad_account_id);

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
      let dbCampaignId: string | null = null;
      if (activation_id) {
        const { data: inserted } = await supabase.from("ad_campaigns").insert({
          activation_id,
          platform: "meta",
          name,
          objective: objective || "OUTCOME_ENGAGEMENT",
          budget: daily_budget || null,
          daily_budget_cents: daily_budget ? Math.round(daily_budget * 100) : null,
          status: campStatus || "paused",
          platform_campaign_id: data.id,
          ad_account_id: ad_account_id,
          targeting: body.targeting || null,
          start_date: body.start_date || null,
          end_date: body.end_date || null,
        }).select("id").single();
        dbCampaignId = inserted?.id || null;
      }

      return new Response(JSON.stringify({ success: true, campaign_id: data.id, db_campaign_id: dbCampaignId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Create ad set ───
    if (action === "create_adset") {
      const ad_account_id = ensureActPrefix(body.ad_account_id);
      const {
        campaign_id, name,
        daily_budget: budget,
        targeting, optimization_goal,
        start_date, end_date,
        age_min, age_max, genders,
        db_campaign_id,
      } = body;

      // Build targeting object
      const targetingObj: Record<string, unknown> = {
        geo_locations: targeting?.geo_locations || { countries: ["BR"] },
      };
      if (age_min) targetingObj.age_min = age_min;
      if (age_max) targetingObj.age_max = age_max;
      if (genders && genders.length > 0) targetingObj.genders = genders;
      if (targeting?.flexible_spec) targetingObj.flexible_spec = targeting.flexible_spec;
      if (targeting?.interests) {
        targetingObj.flexible_spec = [{ interests: targeting.interests }];
      }

      const adsetPayload: Record<string, unknown> = {
        name,
        campaign_id,
        daily_budget: budget || 2000,
        billing_event: "IMPRESSIONS",
        optimization_goal: optimization_goal || "REACH",
        targeting: targetingObj,
        status: "PAUSED",
        access_token: token,
      };

      if (start_date) adsetPayload.start_time = new Date(start_date).toISOString();
      if (end_date) adsetPayload.end_time = new Date(end_date).toISOString();

      const res = await fetch(`${META_GRAPH_URL}/${ad_account_id}/adsets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adsetPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create adset failed [${res.status}]: ${JSON.stringify(data)}`);

      // Update campaign in DB with adset info
      if (db_campaign_id) {
        await supabase.from("ad_campaigns").update({
          platform_adset_id: data.id,
          adset_name: name,
        }).eq("id", db_campaign_id);
      }

      return new Response(JSON.stringify({ success: true, adset_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Create ad creative + ad ───
    if (action === "create_ad") {
      const ad_account_id = ensureActPrefix(body.ad_account_id);
      const {
        adset_id, name, image_url, caption, link,
        instagram_page_id, db_campaign_id, asset_id,
      } = body;

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

      // Save ad creative to DB
      if (db_campaign_id) {
        await supabase.from("ad_creatives").insert({
          campaign_id: db_campaign_id,
          asset_id: asset_id || null,
          name,
          caption,
          link: link || null,
          platform_ad_id: adData.id,
          platform_creative_id: creativeData.id,
          status: "paused",
        });
      }

      return new Response(JSON.stringify({ success: true, ad_id: adData.id, creative_id: creativeData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get campaign status ───
    if (action === "get_campaign_status") {
      const { platform_campaign_id } = body;

      const res = await fetch(
        `${META_GRAPH_URL}/${platform_campaign_id}?fields=id,name,status,effective_status,daily_budget,objective&access_token=${token}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(`Get campaign status failed [${res.status}]: ${JSON.stringify(data)}`);

      // Also fetch adsets
      const adsetsRes = await fetch(
        `${META_GRAPH_URL}/${platform_campaign_id}/adsets?fields=id,name,status,effective_status,daily_budget&access_token=${token}`
      );
      const adsetsData = await adsetsRes.json();

      // Fetch ads for each adset
      const adsets = adsetsData.data || [];
      for (const adset of adsets) {
        const adsRes = await fetch(
          `${META_GRAPH_URL}/${adset.id}/ads?fields=id,name,status,effective_status&access_token=${token}`
        );
        const adsData = await adsRes.json();
        adset.ads = adsData.data || [];
      }

      return new Response(JSON.stringify({ campaign: data, adsets }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get client meta credentials ───
    if (action === "get_client_meta") {
      const { activation_id } = body;
      
      // Get client_id from activation
      const { data: activation } = await supabase
        .from("activations")
        .select("client_id")
        .eq("id", activation_id)
        .single();
      
      if (!activation) throw new Error("Activation not found");

      const { data: metaAccount } = await supabase
        .from("client_meta_accounts")
        .select("*")
        .eq("client_id", activation.client_id)
        .single();

      return new Response(JSON.stringify({ meta_account: metaAccount || null }), {
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
