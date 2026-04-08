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
      throw new Error("META_ACCESS_TOKEN not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action } = body;
    const token = body.page_access_token || META_ACCESS_TOKEN;

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

    // ─── List pixels ───
    if (action === "list_pixels") {
      const ad_account_id = ensureActPrefix(body.ad_account_id);
      if (!ad_account_id) throw new Error("ad_account_id is required");

      const res = await fetch(
        `${META_GRAPH_URL}/${ad_account_id}/adspixels?fields=id,name,is_unavailable&access_token=${token}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(`List pixels failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify({ pixels: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── List custom conversions ───
    if (action === "list_custom_conversions") {
      const ad_account_id = ensureActPrefix(body.ad_account_id);
      if (!ad_account_id) throw new Error("ad_account_id is required");

      const res = await fetch(
        `${META_GRAPH_URL}/${ad_account_id}/customconversions?fields=id,name,pixel,rule&access_token=${token}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(`List custom conversions failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify({ custom_conversions: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Create campaign ───
    if (action === "create_campaign") {
      const { name, objective, status: campStatus, daily_budget, activation_id, special_ad_categories } = body;
      const ad_account_id = ensureActPrefix(body.ad_account_id);

      const res = await fetch(`${META_GRAPH_URL}/${ad_account_id}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          objective: objective || "OUTCOME_ENGAGEMENT",
          status: campStatus || "PAUSED",
          special_ad_categories: special_ad_categories || [],
          access_token: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create campaign failed [${res.status}]: ${JSON.stringify(data)}`);

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
        promoted_object,
        bid_strategy, bid_amount,
        publisher_platforms, facebook_positions, instagram_positions,
      } = body;

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
      if (targeting?.custom_audiences) {
        targetingObj.custom_audiences = targeting.custom_audiences;
      }
      if (publisher_platforms && publisher_platforms.length > 0) {
        targetingObj.publisher_platforms = publisher_platforms;
      }
      if (facebook_positions && facebook_positions.length > 0) {
        targetingObj.facebook_positions = facebook_positions;
      }
      if (instagram_positions && instagram_positions.length > 0) {
        targetingObj.instagram_positions = instagram_positions;
      }

      const adsetPayload: Record<string, unknown> = {
        name,
        campaign_id,
        daily_budget: budget || 2000,
        billing_event: "IMPRESSIONS",
        optimization_goal: optimization_goal || "REACH",
        bid_strategy: bid_strategy || "LOWEST_COST_WITHOUT_CAP",
        targeting: targetingObj,
        status: "PAUSED",
        access_token: token,
      };

      if (bid_amount && (bid_strategy === "COST_CAP" || bid_strategy === "BID_CAP")) {
        adsetPayload.bid_amount = bid_amount;
      }
      if (promoted_object) {
        adsetPayload.promoted_object = promoted_object;
      }
      if (start_date) adsetPayload.start_time = new Date(start_date).toISOString();
      if (end_date) adsetPayload.end_time = new Date(end_date).toISOString();

      const res = await fetch(`${META_GRAPH_URL}/${ad_account_id}/adsets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adsetPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create adset failed [${res.status}]: ${JSON.stringify(data)}`);

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
        adset_id, name, image_url, image_urls, caption, link,
        instagram_page_id, db_campaign_id, asset_id,
        facebook_page_id, call_to_action, url_tags,
      } = body;

      const fbPageId = (facebook_page_id || "").trim();
      const igActorId = (instagram_page_id || "").trim();

      if (!fbPageId) {
        throw new Error("facebook_page_id is required to create an ad creative. Configure it in the client's Meta settings.");
      }

      const normalizedImageUrls = Array.isArray(image_urls)
        ? image_urls.map((url: string) => String(url).trim()).filter(Boolean)
        : [];
      const creativeImageUrls = normalizedImageUrls.length > 0
        ? normalizedImageUrls
        : [String(image_url || "").trim()].filter(Boolean);

      if (creativeImageUrls.length === 0) {
        throw new Error("At least one image URL is required to create an ad creative.");
      }

      const uploadImageHash = async (url: string) => {
        try {
          const imgRes = await fetch(`${META_GRAPH_URL}/${ad_account_id}/adimages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, access_token: token }),
          });
          const imgData = await imgRes.json();
          if (imgRes.ok && imgData.images) {
            return Object.values(imgData.images as Record<string, { hash: string }>)[0]?.hash || null;
          }
          console.warn("adimages upload failed, falling back to direct image URL:", JSON.stringify(imgData));
          return null;
        } catch (e) {
          console.warn("adimages upload exception, falling back to direct image URL:", e);
          return null;
        }
      };

      const buildAttachment = async (url: string) => {
        const imageHash = await uploadImageHash(url);
        const attachment: Record<string, unknown> = { link: link || "https://example.com" };
        if (imageHash) {
          attachment.image_hash = imageHash;
        } else {
          attachment.picture = url;
        }
        if (call_to_action) {
          attachment.call_to_action = { type: call_to_action, value: { link: link || "https://example.com" } };
        }
        return attachment;
      };

      const attachments = [] as Record<string, unknown>[];
      for (const url of creativeImageUrls) {
        attachments.push(await buildAttachment(url));
      }

      const linkData: Record<string, unknown> = {
        message: caption,
        link: link || "https://example.com",
      };

      if (call_to_action && attachments.length <= 1) {
        linkData.call_to_action = { type: call_to_action, value: { link: link || "https://example.com" } };
      }

      if (attachments.length > 1) {
        linkData.child_attachments = attachments;
        linkData.multi_share_optimized = false;
      } else {
        Object.assign(linkData, attachments[0]);
      }

      const createCreative = async (includeInstagramActor: boolean) => {
        const storySpec: Record<string, unknown> = {
          page_id: fbPageId,
          link_data: linkData,
        };
        if (includeInstagramActor && igActorId) {
          storySpec.instagram_actor_id = igActorId;
        }

        const creativePayload: Record<string, unknown> = {
          name: `Creative - ${name}`,
          object_story_spec: storySpec,
          access_token: token,
        };
        if (url_tags) {
          creativePayload.url_tags = url_tags;
        }

        const res = await fetch(`${META_GRAPH_URL}/${ad_account_id}/adcreatives`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creativePayload),
        });

        return {
          ok: res.ok,
          status: res.status,
          data: await res.json(),
        };
      };

      let creativeAttempt = await createCreative(Boolean(igActorId));
      if (!creativeAttempt.ok && igActorId) {
        const creativeErrorText = JSON.stringify(creativeAttempt.data);
        if (creativeErrorText.includes("instagram_actor_id")) {
          console.warn("instagram_actor_id inválido; tentando criar o criativo sem instagram_actor_id");
          creativeAttempt = await createCreative(false);
        }
      }

      if (!creativeAttempt.ok) {
        throw new Error(`Create creative failed [${creativeAttempt.status}]: ${JSON.stringify(creativeAttempt.data)}`);
      }
      const creativeData = creativeAttempt.data;

      const adPayload: Record<string, unknown> = {
        name,
        adset_id,
        creative: { creative_id: creativeData.id },
        status: "PAUSED",
        access_token: token,
      };
      if (url_tags) {
        adPayload.tracking_specs = JSON.stringify([{ "action.type": ["offsite_conversion"], fb_pixel: [body.pixel_id] }]);
      }

      const adRes = await fetch(`${META_GRAPH_URL}/${ad_account_id}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adPayload),
      });
      const adData = await adRes.json();
      if (!adRes.ok) throw new Error(`Create ad failed [${adRes.status}]: ${JSON.stringify(adData)}`);

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

      const adsetsRes = await fetch(
        `${META_GRAPH_URL}/${platform_campaign_id}/adsets?fields=id,name,status,effective_status,daily_budget&access_token=${token}`
      );
      const adsetsData = await adsetsRes.json();

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
      const { activation_id, context } = body;
      
      const { data: activation } = await supabase
        .from("activations")
        .select("client_id")
        .eq("id", activation_id)
        .single();
      
      if (!activation) throw new Error("Activation not found");

      const { data: metaRecords } = await supabase
        .from("client_meta_accounts")
        .select("*")
        .eq("client_id", activation.client_id)
        .in("platform", ["meta_ads", "meta_organic", "meta"]);

      const adsRec = metaRecords?.find((r: any) => r.platform === "meta_ads")
        || metaRecords?.find((r: any) => r.platform === "meta");
      const orgRec = metaRecords?.find((r: any) => r.platform === "meta_organic")
        || metaRecords?.find((r: any) => r.platform === "meta");

      if (context === "organic") {
        return new Response(JSON.stringify({ meta_account: orgRec || null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const merged = adsRec || orgRec ? {
        ...(adsRec || {}),
        ad_account_id: adsRec?.ad_account_id || null,
        pixel_id: adsRec?.pixel_id || null,
        page_access_token: adsRec?.page_access_token || orgRec?.page_access_token || null,
        facebook_page_id: orgRec?.facebook_page_id || adsRec?.facebook_page_id || null,
        instagram_page_id: orgRec?.instagram_page_id || adsRec?.instagram_page_id || null,
        instagram_username: orgRec?.instagram_username || adsRec?.instagram_username || null,
      } : null;

      return new Response(JSON.stringify({ meta_account: merged }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── List campaigns (from Meta, filtered by name) ───
    if (action === "list_campaigns") {
      const ad_account_id = ensureActPrefix(body.ad_account_id);
      const { name_filter } = body;

      if (!ad_account_id) throw new Error("ad_account_id is required");

      let url = `${META_GRAPH_URL}/${ad_account_id}/campaigns?fields=id,name,status,effective_status,daily_budget,objective,start_time,stop_time&limit=100&access_token=${token}`;

      if (name_filter) {
        const filtering = JSON.stringify([{ field: "name", operator: "CONTAIN", value: name_filter }]);
        url += `&filtering=${encodeURIComponent(filtering)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(`List campaigns failed [${res.status}]: ${JSON.stringify(data)}`);

      const campaignsList = data.data || [];

      for (const camp of campaignsList) {
        try {
          const adsetsRes = await fetch(
            `${META_GRAPH_URL}/${camp.id}/adsets?fields=id,name,status,daily_budget&limit=50&access_token=${token}`
          );
          const adsetsData = await adsetsRes.json();
          camp.adsets = adsetsData.data || [];
        } catch {
          camp.adsets = [];
        }
      }

      return new Response(JSON.stringify({ campaigns: campaignsList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── List adsets for a campaign ───
    if (action === "list_adsets") {
      const { platform_campaign_id } = body;
      if (!platform_campaign_id) throw new Error("platform_campaign_id is required");

      const res = await fetch(
        `${META_GRAPH_URL}/${platform_campaign_id}/adsets?fields=id,name,status,effective_status,daily_budget&limit=100&access_token=${token}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(`List adsets failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify({ adsets: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Update campaign/adset/ad status (pause/activate) ───
    if (action === "update_status") {
      const { object_id, new_status } = body;
      if (!object_id) throw new Error("object_id is required");
      if (!new_status) throw new Error("new_status is required (ACTIVE or PAUSED)");

      const res = await fetch(`${META_GRAPH_URL}/${object_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: new_status, access_token: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Update status failed [${res.status}]: ${JSON.stringify(data)}`);

      const { db_id, db_table } = body;
      if (db_id && db_table) {
        const table = db_table === "ad_creatives" ? "ad_creatives" : "ad_campaigns";
        await supabase.from(table).update({ status: new_status.toLowerCase() }).eq("id", db_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Update adset daily budget ───
    if (action === "update_budget") {
      const { object_id, daily_budget_cents } = body;
      if (!object_id) throw new Error("object_id is required");
      if (!daily_budget_cents) throw new Error("daily_budget_cents is required");

      const res = await fetch(`${META_GRAPH_URL}/${object_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_budget: daily_budget_cents, access_token: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Update budget failed [${res.status}]: ${JSON.stringify(data)}`);

      const { db_campaign_id } = body;
      if (db_campaign_id) {
        await supabase.from("ad_campaigns").update({ daily_budget_cents }).eq("id", db_campaign_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get insights (campaign, adset, or ad level) ───
    if (action === "get_insights") {
      const { object_id, level, date_preset, time_range } = body;
      if (!object_id) throw new Error("object_id is required");

      const fields = "impressions,reach,clicks,cpc,cpm,ctr,spend,actions,cost_per_action_type,frequency,unique_clicks,inline_link_clicks,inline_link_click_ctr";
      let url = `${META_GRAPH_URL}/${object_id}/insights?fields=${fields}&access_token=${token}`;
      
      if (level) url += `&level=${level}`;
      if (date_preset) {
        url += `&date_preset=${date_preset}`;
      } else if (time_range) {
        url += `&time_range=${encodeURIComponent(JSON.stringify(time_range))}`;
      } else {
        url += `&date_preset=last_30d`;
      }

      const dailyUrl = `${META_GRAPH_URL}/${object_id}/insights?fields=impressions,reach,clicks,spend,actions,ctr,cpc&time_increment=1&date_preset=${date_preset || "last_30d"}&access_token=${token}&limit=90`;

      const [summaryRes, dailyRes] = await Promise.all([
        fetch(url),
        fetch(dailyUrl),
      ]);

      const summaryData = await summaryRes.json();
      const dailyData = await dailyRes.json();

      if (!summaryRes.ok) throw new Error(`Get insights failed [${summaryRes.status}]: ${JSON.stringify(summaryData)}`);

      return new Response(JSON.stringify({
        summary: summaryData.data?.[0] || null,
        daily: dailyData.data || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get insights per ad (creative-level breakdown) ───
    if (action === "get_ad_insights") {
      const { campaign_id } = body;
      const ad_account_id = ensureActPrefix(body.ad_account_id);
      if (!ad_account_id) throw new Error("ad_account_id is required");

      const fields = "ad_id,ad_name,impressions,reach,clicks,spend,ctr,cpc,actions,cost_per_action_type";
      let url = `${META_GRAPH_URL}/${ad_account_id}/insights?fields=${fields}&level=ad&date_preset=${body.date_preset || "last_30d"}&limit=100&access_token=${token}`;
      
      if (campaign_id) {
        const filtering = JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaign_id }]);
        url += `&filtering=${encodeURIComponent(filtering)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(`Get ad insights failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify({ ads: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── List custom audiences ───
    if (action === "list_audiences") {
      const ad_account_id = ensureActPrefix(body.ad_account_id);
      if (!ad_account_id) throw new Error("ad_account_id is required");

      const res = await fetch(
        `${META_GRAPH_URL}/${ad_account_id}/customaudiences?fields=id,name,subtype,delivery_status,description,time_created&limit=100&access_token=${token}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(`List audiences failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify({ audiences: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Create custom audience ───
    if (action === "create_audience") {
      const ad_account_id = ensureActPrefix(body.ad_account_id);
      if (!ad_account_id) throw new Error("ad_account_id is required");

      const { name, description, subtype, rule, customer_file_source } = body;
      if (!name) throw new Error("name is required");

      const payload: Record<string, string> = {
        name,
        description: description || "",
        access_token: token,
      };

      if (subtype && subtype !== "CUSTOM") {
        payload.subtype = subtype;
      }

      if (subtype === "WEBSITE") {
        payload.rule = rule
          ? (typeof rule === "string" ? rule : JSON.stringify(rule))
          : JSON.stringify({
              inclusions: { operator: "or", rules: [{ event_sources: [{ id: body.pixel_id, type: "pixel" }], retention_seconds: 2592000, filter: { operator: "and", filters: [{ field: "url", operator: "i_contains", value: "" }] } }] }
            });
      }
      if (subtype === "ENGAGEMENT") {
        if (!rule) throw new Error("Para audiências de engajamento, forneça a regra completa (rule) no formato JSON do Meta. Use audiências existentes listadas na aba Audiências.");
        payload.rule = typeof rule === "string" ? rule : JSON.stringify(rule);
        payload.prefill = "true";
      }
      if (customer_file_source) {
        payload.customer_file_source = customer_file_source;
      }

      // Use URLSearchParams — Meta expects form-data style
      const params = new URLSearchParams();
      params.append("name", payload.name);
      if (payload.description) params.append("description", payload.description);
      if (payload.subtype) params.append("subtype", payload.subtype);
      if (payload.rule) params.append("rule", payload.rule);
      if (payload.customer_file_source) params.append("customer_file_source", payload.customer_file_source);
      params.append("access_token", token);

      console.log("create_audience rule:", payload.rule);

      const res = await fetch(`${META_GRAPH_URL}/${ad_account_id}/customaudiences`, {
        method: "POST",
        body: params,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create audience failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify({ success: true, audience_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Create lookalike audience ───
    if (action === "create_lookalike") {
      const ad_account_id = ensureActPrefix(body.ad_account_id);
      if (!ad_account_id) throw new Error("ad_account_id is required");

      const { name, origin_audience_id, country, ratio } = body;
      if (!name || !origin_audience_id) throw new Error("name and origin_audience_id are required");

      const spec = {
        origin: [{ id: origin_audience_id, type: "custom_audience" }],
        starting_ratio: 0,
        ratio: ratio || 0.01,
        country: country || "BR",
      };

      const res = await fetch(`${META_GRAPH_URL}/${ad_account_id}/customaudiences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subtype: "LOOKALIKE",
          lookalike_spec: JSON.stringify(spec),
          access_token: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create lookalike failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify({ success: true, audience_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Delete audience ───
    if (action === "delete_audience") {
      const { audience_id } = body;
      if (!audience_id) throw new Error("audience_id is required");

      const res = await fetch(`${META_GRAPH_URL}/${audience_id}?access_token=${token}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(`Delete audience failed [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify({ success: true }), {
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
