import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check, ChevronRight, ChevronLeft, Image as ImageIcon, Target, Crosshair, LayoutGrid, Megaphone, ClipboardList } from "lucide-react";

interface CreateCampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activationId: string;
  metaAccount: {
    ad_account_id: string | null;
    page_access_token: string | null;
    instagram_page_id: string | null;
    facebook_page_id: string | null;
    pixel_id?: string | null;
  } | null;
  landingPageUrl?: string | null;
  onCreated: () => void;
}

const OBJECTIVES = [
  { value: "OUTCOME_AWARENESS", label: "Reconhecimento", icon: "👁", desc: "Alcance e impressões" },
  { value: "OUTCOME_TRAFFIC", label: "Tráfego", icon: "🔗", desc: "Cliques no link" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engajamento", icon: "💬", desc: "Curtidas, comentários, compartilhamentos" },
  { value: "OUTCOME_LEADS", label: "Leads", icon: "📋", desc: "Formulários e conversões de lead" },
  { value: "OUTCOME_SALES", label: "Vendas", icon: "🛒", desc: "Compras e conversões" },
];

const OBJECTIVE_CONFIG: Record<string, { optimization_goal: string; requiresPixel: boolean; defaultEvent: string }> = {
  OUTCOME_AWARENESS: { optimization_goal: "REACH", requiresPixel: false, defaultEvent: "" },
  OUTCOME_TRAFFIC: { optimization_goal: "LINK_CLICKS", requiresPixel: false, defaultEvent: "" },
  OUTCOME_ENGAGEMENT: { optimization_goal: "POST_ENGAGEMENT", requiresPixel: false, defaultEvent: "" },
  OUTCOME_LEADS: { optimization_goal: "OFFSITE_CONVERSIONS", requiresPixel: true, defaultEvent: "LEAD" },
  OUTCOME_SALES: { optimization_goal: "OFFSITE_CONVERSIONS", requiresPixel: true, defaultEvent: "PURCHASE" },
};

const BID_STRATEGIES = [
  { value: "LOWEST_COST_WITHOUT_CAP", label: "Menor custo", desc: "Meta otimiza automaticamente" },
  { value: "COST_CAP", label: "Cost Cap", desc: "Define custo máximo por resultado" },
  { value: "BID_CAP", label: "Bid Cap", desc: "Define lance máximo no leilão" },
];

const CONVERSION_EVENTS = [
  { value: "LEAD", label: "Lead" },
  { value: "PURCHASE", label: "Compra" },
  { value: "ADD_TO_CART", label: "Adicionar ao carrinho" },
  { value: "COMPLETE_REGISTRATION", label: "Cadastro completo" },
  { value: "INITIATE_CHECKOUT", label: "Iniciar checkout" },
  { value: "VIEW_CONTENT", label: "Visualizar conteúdo" },
  { value: "SUBSCRIBE", label: "Inscrição" },
  { value: "CONTACT", label: "Contato" },
];

const CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Saiba mais" },
  { value: "SHOP_NOW", label: "Comprar agora" },
  { value: "SIGN_UP", label: "Cadastre-se" },
  { value: "SUBSCRIBE", label: "Inscreva-se" },
  { value: "DOWNLOAD", label: "Baixar" },
  { value: "GET_OFFER", label: "Obter oferta" },
  { value: "CONTACT_US", label: "Fale conosco" },
  { value: "APPLY_NOW", label: "Candidate-se" },
  { value: "SEND_WHATSAPP_MESSAGE", label: "Enviar WhatsApp" },
];

const PLACEMENTS = {
  facebook: [
    { value: "feed", label: "Feed" },
    { value: "right_hand_column", label: "Coluna direita" },
    { value: "marketplace", label: "Marketplace" },
    { value: "video_feeds", label: "Vídeos" },
    { value: "story", label: "Stories" },
    { value: "search", label: "Pesquisa" },
  ],
  instagram: [
    { value: "stream", label: "Feed" },
    { value: "story", label: "Stories" },
    { value: "reels", label: "Reels" },
    { value: "explore", label: "Explorar" },
    { value: "explore_home", label: "Explorar Home" },
  ],
};

interface ApprovedAsset {
  id: string;
  name: string;
  copy_id: string | null;
  renders: { png_url: string | null; slide_index: number }[];
  copy?: { hook: string | null; full_copy: string | null };
}

const sortRenders = (renders: { png_url: string | null; slide_index: number }[]) =>
  [...renders].sort((a, b) => (a.slide_index ?? 0) - (b.slide_index ?? 0));

const STEP_LABELS = ["Campanha", "Estratégia", "Segmentação", "Anúncios", "Revisão"];
const STEP_ICONS = [Target, Crosshair, LayoutGrid, Megaphone, ClipboardList];

const inputStyle = {
  background: "hsl(var(--bg-surface2))",
  border: "1px solid hsl(var(--border-default))",
  color: "hsl(var(--text-primary))",
  fontFamily: "'DM Sans'",
};
const monoInputStyle = { ...inputStyle, fontFamily: "'JetBrains Mono', monospace" };
const labelStyle = { color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" };

export const CreateCampaignWizard = ({
  open, onOpenChange, activationId, metaAccount, landingPageUrl, onCreated,
}: CreateCampaignWizardProps) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Campaign
  const [campaignName, setCampaignName] = useState("");
  const [activationSlug, setActivationSlug] = useState("");
  const [objective, setObjective] = useState("OUTCOME_ENGAGEMENT");
  const [dailyBudget, setDailyBudget] = useState("20");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 2: Strategy
  const [bidStrategy, setBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP");
  const [bidAmount, setBidAmount] = useState("");
  const [pixelId, setPixelId] = useState(metaAccount?.pixel_id || "");
  const [conversionEvent, setConversionEvent] = useState("");
  const [pixels, setPixels] = useState<{ id: string; name: string }[]>([]);
  const [loadingPixels, setLoadingPixels] = useState(false);

  // Step 3: Targeting
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [genders, setGenders] = useState<number[]>([]);
  const [interests, setInterests] = useState("");
  const [placementMode, setPlacementMode] = useState<"automatic" | "manual">("automatic");
  const [fbPositions, setFbPositions] = useState<string[]>([]);
  const [igPositions, setIgPositions] = useState<string[]>([]);

  // Step 4: Ads
  const [approvedAssets, setApprovedAssets] = useState<ApprovedAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [ctaType, setCtaType] = useState("LEARN_MORE");
  const [destinationUrl, setDestinationUrl] = useState(landingPageUrl || "");
  const [utmSource, setUtmSource] = useState("facebook");
  const [utmMedium, setUtmMedium] = useState("paid");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmDynamic, setUtmDynamic] = useState(false);
  const [utmLoaded, setUtmLoaded] = useState(false);

  const objConfig = OBJECTIVE_CONFIG[objective];

  useEffect(() => {
    if (open && activationId) {
      supabase.from("activations").select("slug").eq("id", activationId).single()
        .then(({ data }) => { if (data?.slug) setActivationSlug(data.slug); });

      // Load meta_ads UTM config
      if (!utmLoaded) {
        supabase.from("utm_configs").select("*").eq("activation_id", activationId).eq("channel", "meta_ads").single()
          .then(({ data: utmData }) => {
            if (utmData) {
              if (utmData.utm_source) setUtmSource(utmData.utm_source);
              if (utmData.utm_medium) setUtmMedium(utmData.utm_medium);
              if (utmData.utm_campaign) setUtmCampaign(utmData.utm_campaign);
              if (utmData.utm_content) setUtmContent(utmData.utm_content);
              if (utmData.utm_term) setUtmTerm(utmData.utm_term);
              setUtmDynamic(utmData.use_dynamic_params || false);
            }
            setUtmLoaded(true);
          });
      }
    }
  }, [open, activationId]);

  useEffect(() => {
    if (metaAccount?.pixel_id) setPixelId(metaAccount.pixel_id);
  }, [metaAccount?.pixel_id]);

  useEffect(() => {
    const cfg = OBJECTIVE_CONFIG[objective];
    if (cfg) setConversionEvent(cfg.defaultEvent);
  }, [objective]);

  // Load pixels when entering Step 2 with conversion objective
  useEffect(() => {
    if (open && step === 2 && objConfig?.requiresPixel && metaAccount?.ad_account_id && pixels.length === 0) {
      loadPixels();
    }
  }, [open, step, objective]);

  useEffect(() => {
    if (open && step === 4) loadApprovedAssets();
  }, [open, step]);

  const loadPixels = async () => {
    if (!metaAccount?.ad_account_id) return;
    setLoadingPixels(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: { action: "list_pixels", ad_account_id: metaAccount.ad_account_id, page_access_token: metaAccount.page_access_token },
      });
      if (!error && data?.pixels) {
        setPixels(data.pixels.filter((p: any) => !p.is_unavailable));
        if (!pixelId && data.pixels.length > 0) setPixelId(data.pixels[0].id);
      }
    } catch { /* ignore */ }
    setLoadingPixels(false);
  };

  const loadApprovedAssets = async () => {
    setLoadingAssets(true);
    const { data: assets } = await supabase
      .from("assets").select("id, name, copy_id")
      .eq("activation_id", activationId).eq("status", "approved");

    if (!assets || assets.length === 0) { setApprovedAssets([]); setLoadingAssets(false); return; }

    const assetIds = assets.map(a => a.id);
    const { data: renders } = await supabase.from("asset_template_renders")
      .select("asset_id, png_url, slide_index").in("asset_id", assetIds);

    const copyIds = assets.filter(a => a.copy_id).map(a => a.copy_id!);
    let copiesMap: Record<string, { hook: string | null; full_copy: string | null }> = {};
    if (copyIds.length > 0) {
      const { data: copies } = await supabase.from("copies").select("id, hook, full_copy").in("id", copyIds);
      if (copies) copiesMap = Object.fromEntries(copies.map(c => [c.id, { hook: c.hook, full_copy: c.full_copy }]));
    }

    const enriched: ApprovedAsset[] = assets.map(a => ({
      ...a,
      renders: sortRenders((renders || []).filter(r => r.asset_id === a.id).map(r => ({ png_url: r.png_url, slide_index: r.slide_index ?? 0 }))),
      copy: a.copy_id ? copiesMap[a.copy_id] : undefined,
    }));

    setApprovedAssets(enriched);
    setSelectedAssetIds(new Set(enriched.map(a => a.id)));
    setLoadingAssets(false);
  };

  const toggleAsset = (id: string) => {
    setSelectedAssetIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const togglePosition = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const canProceed = () => {
    if (step === 1) return campaignName.trim().length > 0 && !!metaAccount?.ad_account_id;
    if (step === 2) {
      if (objConfig?.requiresPixel && !pixelId) return false;
      if ((bidStrategy === "COST_CAP" || bidStrategy === "BID_CAP") && !bidAmount) return false;
      return true;
    }
    if (step === 3) return true;
    if (step === 4) return selectedAssetIds.size > 0;
    if (step === 5) return true;
    return false;
  };

  const buildUtmTags = () => {
    const parts: string[] = [];
    if (utmSource) parts.push(`utm_source=${utmDynamic ? utmSource : encodeURIComponent(utmSource)}`);
    if (utmMedium) parts.push(`utm_medium=${utmDynamic ? utmMedium : encodeURIComponent(utmMedium)}`);
    if (utmCampaign) parts.push(`utm_campaign=${utmDynamic ? utmCampaign : encodeURIComponent(utmCampaign)}`);
    if (utmContent) parts.push(`utm_content=${utmDynamic ? utmContent : encodeURIComponent(utmContent)}`);
    if (utmTerm) parts.push(`utm_term=${utmDynamic ? utmTerm : encodeURIComponent(utmTerm)}`);
    return parts.join("&");
  };

  const handleSubmit = async () => {
    if (!metaAccount?.ad_account_id) { toast.error("Conta de anúncio Meta não configurada"); return; }

    setSubmitting(true);
    try {
      const budgetCents = Math.round(parseFloat(dailyBudget) * 100);
      const fullCampaignName = activationSlug ? `${activationSlug} — ${campaignName}` : campaignName;

      // 1. Create campaign
      const { data: campRes, error: campErr } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "create_campaign",
          ad_account_id: metaAccount.ad_account_id,
          name: fullCampaignName,
          objective,
          status: "PAUSED",
          daily_budget: parseFloat(dailyBudget),
          activation_id: activationId,
          page_access_token: metaAccount.page_access_token,
          targeting: { geo_locations: { countries: ["BR"] } },
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
      });
      if (campErr) throw new Error(campErr.message);
      if (campRes?.error) throw new Error(campRes.error);

      const platformCampaignId = campRes.campaign_id;
      const dbCampaignId = campRes.db_campaign_id;

      // 2. Create adset with strategy
      const adsetBody: Record<string, unknown> = {
        action: "create_adset",
        ad_account_id: metaAccount.ad_account_id,
        campaign_id: platformCampaignId,
        name: `${fullCampaignName} — Conjunto`,
        daily_budget: budgetCents,
        optimization_goal: objConfig?.optimization_goal || "REACH",
        bid_strategy: bidStrategy,
        age_min: parseInt(ageMin),
        age_max: parseInt(ageMax),
        genders: genders.length > 0 ? genders : undefined,
        targeting: { geo_locations: { countries: ["BR"] } },
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page_access_token: metaAccount.page_access_token,
        db_campaign_id: dbCampaignId,
      };

      if ((bidStrategy === "COST_CAP" || bidStrategy === "BID_CAP") && bidAmount) {
        adsetBody.bid_amount = Math.round(parseFloat(bidAmount) * 100);
      }

      if (objConfig?.requiresPixel && pixelId) {
        adsetBody.promoted_object = { pixel_id: pixelId, custom_event_type: conversionEvent || objConfig.defaultEvent };
      }

      if (placementMode === "manual") {
        if (fbPositions.length > 0 || igPositions.length > 0) {
          const platforms: string[] = [];
          if (fbPositions.length > 0) platforms.push("facebook");
          if (igPositions.length > 0) platforms.push("instagram");
          adsetBody.publisher_platforms = platforms;
          if (fbPositions.length > 0) adsetBody.facebook_positions = fbPositions;
          if (igPositions.length > 0) adsetBody.instagram_positions = igPositions;
        }
      }

      const { data: adsetRes, error: adsetErr } = await supabase.functions.invoke("meta-ads", { body: adsetBody });
      if (adsetErr) throw new Error(adsetErr.message);
      if (adsetRes?.error) throw new Error(adsetRes.error);

      const adsetId = adsetRes.adset_id;

      // 3. Create ads
      const selectedAssets = approvedAssets.filter(a => selectedAssetIds.has(a.id));
      let successCount = 0;
      const urlTags = buildUtmTags();

      for (const asset of selectedAssets) {
        const imageUrls = sortRenders(asset.renders).map(r => r.png_url).filter((url): url is string => Boolean(url));
        if (imageUrls.length === 0) continue;

        try {
          const { data: adRes, error: adErr } = await supabase.functions.invoke("meta-ads", {
            body: {
              action: "create_ad",
              ad_account_id: metaAccount.ad_account_id,
              adset_id: adsetId,
              name: asset.name || `Ad ${successCount + 1}`,
              image_url: imageUrls[0],
              image_urls: imageUrls,
              caption: asset.copy?.full_copy || asset.copy?.hook || "",
              link: destinationUrl || landingPageUrl || "https://example.com",
              call_to_action: ctaType,
              url_tags: urlTags || undefined,
              pixel_id: pixelId || undefined,
              instagram_page_id: metaAccount.instagram_page_id,
              facebook_page_id: metaAccount.facebook_page_id,
              page_access_token: metaAccount.page_access_token,
              db_campaign_id: dbCampaignId,
              asset_id: asset.id,
            },
          });
          if (!adErr && !adRes?.error) successCount++;
        } catch (e) {
          console.error(`Failed to create ad for asset ${asset.id}:`, e);
        }
      }

      toast.success(`Campanha criada com ${successCount} anúncio(s)`);
      onOpenChange(false);
      onCreated();

      setStep(1);
      setCampaignName("");
      setObjective("OUTCOME_ENGAGEMENT");
      setDailyBudget("20");
      setStartDate("");
      setEndDate("");
      setBidStrategy("LOWEST_COST_WITHOUT_CAP");
      setBidAmount("");
    } catch (err: any) {
      console.error("Campaign creation error:", err);
      toast.error(err.message || "Erro ao criar campanha");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1.5 mb-4 overflow-x-auto">
      {STEP_LABELS.map((label, i) => {
        const s = i + 1;
        const Icon = STEP_ICONS[i];
        return (
          <div key={s} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => s < step && setStep(s)}
              disabled={s > step}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all"
              style={{
                background: s === step ? "hsl(var(--accent) / 0.15)" : s < step ? "hsl(var(--accent) / 0.08)" : "transparent",
                color: s <= step ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
                cursor: s < step ? "pointer" : s === step ? "default" : "not-allowed",
                fontFamily: "'DM Sans'",
              }}
            >
              {s < step ? <Check size={10} /> : <Icon size={10} />}
              <span className="hidden sm:inline">{label}</span>
            </button>
            {s < 5 && <div className="w-3 h-px" style={{ background: s < step ? "hsl(var(--accent))" : "hsl(var(--border-default))" }} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))" }}
      >
        <DialogHeader>
          <DialogTitle className="text-display-sm" style={{ color: "hsl(var(--text-primary))" }}>
            Criar Campanha Meta Ads
          </DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        {/* ═══ Step 1: Campaign ═══ */}
        {step === 1 && (
          <div className="space-y-4">
            {!metaAccount?.ad_account_id && (
              <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--status-rejected) / 0.1)", color: "hsl(var(--status-rejected))", fontFamily: "'DM Sans'" }}>
                ⚠ Conta de anúncio Meta não configurada. Vá em Configurações do Cliente para adicionar.
              </div>
            )}

            <div>
              <Label className="text-xs mb-1.5 block" style={labelStyle}>Nome da campanha</Label>
              <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ex: Black Friday 2026" style={inputStyle} />
            </div>

            <div>
              <Label className="text-xs mb-1.5 block" style={labelStyle}>Objetivo</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OBJECTIVES.map(obj => (
                  <button
                    key={obj.value}
                    type="button"
                    onClick={() => setObjective(obj.value)}
                    className="px-3 py-2.5 rounded-md text-xs text-left transition-all flex items-start gap-2"
                    style={{
                      background: objective === obj.value ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                      border: `1px solid ${objective === obj.value ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                      color: objective === obj.value ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                      fontFamily: "'DM Sans'",
                    }}
                  >
                    <span className="text-sm">{obj.icon}</span>
                    <div>
                      <div className="font-medium">{obj.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{obj.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block" style={labelStyle}>Orçamento diário (R$)</Label>
                <Input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} min={1} style={monoInputStyle} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={labelStyle}>Início</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={monoInputStyle} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={labelStyle}>Fim</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={monoInputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ Step 2: Strategy ═══ */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block" style={labelStyle}>Estratégia de lance</Label>
              <div className="space-y-2">
                {BID_STRATEGIES.map(bs => (
                  <button
                    key={bs.value}
                    type="button"
                    onClick={() => setBidStrategy(bs.value)}
                    className="w-full px-3 py-2.5 rounded-md text-xs text-left transition-all flex justify-between items-center"
                    style={{
                      background: bidStrategy === bs.value ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                      border: `1px solid ${bidStrategy === bs.value ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                      color: bidStrategy === bs.value ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                      fontFamily: "'DM Sans'",
                    }}
                  >
                    <div>
                      <div className="font-medium">{bs.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{bs.desc}</div>
                    </div>
                    {bidStrategy === bs.value && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            {(bidStrategy === "COST_CAP" || bidStrategy === "BID_CAP") && (
              <div>
                <Label className="text-xs mb-1.5 block" style={labelStyle}>
                  {bidStrategy === "COST_CAP" ? "Custo máximo por resultado (R$)" : "Lance máximo (R$)"}
                </Label>
                <Input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} min={0.01} step="0.01" placeholder="5.00" style={monoInputStyle} />
              </div>
            )}

            {objConfig?.requiresPixel && (
              <>
                <div>
                  <Label className="text-xs mb-1.5 block" style={labelStyle}>Pixel</Label>
                  {loadingPixels ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 size={14} className="animate-spin" style={{ color: "hsl(var(--text-muted))" }} />
                      <span className="text-xs" style={{ color: "hsl(var(--text-muted))" }}>Buscando pixels...</span>
                    </div>
                  ) : pixels.length > 0 ? (
                    <div className="space-y-1.5">
                      {pixels.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPixelId(p.id)}
                          className="w-full px-3 py-2 rounded-md text-xs text-left transition-all flex justify-between items-center"
                          style={{
                            background: pixelId === p.id ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                            border: `1px solid ${pixelId === p.id ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                            color: pixelId === p.id ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                            fontFamily: "'DM Sans'",
                          }}
                        >
                          <span>{p.name}</span>
                          <span className="font-mono text-[10px] opacity-60">{p.id}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <Input value={pixelId} onChange={e => setPixelId(e.target.value)} placeholder="ID do pixel" style={monoInputStyle} />
                      <p className="text-[10px] mt-1" style={{ color: "hsl(var(--text-muted))" }}>Nenhum pixel encontrado automaticamente. Insira o ID manualmente.</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs mb-1.5 block" style={labelStyle}>Evento de conversão</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CONVERSION_EVENTS.map(ev => (
                      <button
                        key={ev.value}
                        type="button"
                        onClick={() => setConversionEvent(ev.value)}
                        className="px-2.5 py-1.5 rounded-md text-[11px] transition-all"
                        style={{
                          background: conversionEvent === ev.value ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                          border: `1px solid ${conversionEvent === ev.value ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                          color: conversionEvent === ev.value ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                          fontFamily: "'DM Sans'",
                        }}
                      >
                        {ev.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!objConfig?.requiresPixel && (
              <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--bg-surface2))", color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
                O objetivo <strong>{OBJECTIVES.find(o => o.value === objective)?.label}</strong> não requer pixel de conversão.
              </div>
            )}
          </div>
        )}

        {/* ═══ Step 3: Targeting ═══ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block" style={labelStyle}>Idade mín.</Label>
                <Input type="number" value={ageMin} onChange={e => setAgeMin(e.target.value)} min={13} max={65} style={monoInputStyle} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={labelStyle}>Idade máx.</Label>
                <Input type="number" value={ageMax} onChange={e => setAgeMax(e.target.value)} min={13} max={65} style={monoInputStyle} />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block" style={labelStyle}>Gênero</Label>
              <div className="flex gap-2">
                {[{ value: 0, label: "Todos" }, { value: 1, label: "Masculino" }, { value: 2, label: "Feminino" }].map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => { if (g.value === 0) setGenders([]); else setGenders(prev => prev.includes(g.value) ? prev.filter(x => x !== g.value) : [...prev, g.value]); }}
                    className="px-3 py-2 rounded-md text-xs transition-all"
                    style={{
                      background: (g.value === 0 && genders.length === 0) || genders.includes(g.value) ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                      border: `1px solid ${(g.value === 0 && genders.length === 0) || genders.includes(g.value) ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                      color: (g.value === 0 && genders.length === 0) || genders.includes(g.value) ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                      fontFamily: "'DM Sans'",
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block" style={labelStyle}>Interesses (separados por vírgula)</Label>
              <Textarea value={interests} onChange={e => setInterests(e.target.value)} placeholder="Ex: fitness, nutrição, bem-estar" rows={2} style={inputStyle} />
            </div>

            <div>
              <Label className="text-xs mb-1.5 block" style={labelStyle}>Posicionamento</Label>
              <div className="flex gap-2 mb-2">
                {(["automatic", "manual"] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPlacementMode(mode)}
                    className="px-3 py-2 rounded-md text-xs transition-all"
                    style={{
                      background: placementMode === mode ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                      border: `1px solid ${placementMode === mode ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                      color: placementMode === mode ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                      fontFamily: "'DM Sans'",
                    }}
                  >
                    {mode === "automatic" ? "Automático (recomendado)" : "Manual"}
                  </button>
                ))}
              </div>

              {placementMode === "manual" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))" }}>Facebook</p>
                    <div className="space-y-1">
                      {PLACEMENTS.facebook.map(p => (
                        <label key={p.value} className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
                          <input type="checkbox" checked={fbPositions.includes(p.value)} onChange={() => togglePosition(fbPositions, setFbPositions, p.value)} className="rounded" />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))" }}>Instagram</p>
                    <div className="space-y-1">
                      {PLACEMENTS.instagram.map(p => (
                        <label key={p.value} className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
                          <input type="checkbox" checked={igPositions.includes(p.value)} onChange={() => togglePosition(igPositions, setIgPositions, p.value)} className="rounded" />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ Step 4: Ads ═══ */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block" style={labelStyle}>Botão CTA</Label>
                <select
                  value={ctaType}
                  onChange={e => setCtaType(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-xs"
                  style={inputStyle}
                >
                  {CTA_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={labelStyle}>URL destino</Label>
                <Input value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} placeholder="https://..." style={monoInputStyle} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Label className="text-xs" style={labelStyle}>UTM Tracking</Label>
                {utmDynamic && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))", fontFamily: "'JetBrains Mono'" }}>
                    Dinâmico
                  </span>
                )}
                {utmLoaded && !utmDynamic && (
                  <span className="text-[9px]" style={{ color: "hsl(var(--text-muted))" }}>da aba UTMs</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] block mb-0.5" style={{ color: "hsl(var(--text-muted))" }}>Source</span>
                  <Input value={utmSource} onChange={e => setUtmSource(e.target.value)} placeholder="facebook" style={{ ...monoInputStyle, fontSize: "11px" }} />
                </div>
                <div>
                  <span className="text-[10px] block mb-0.5" style={{ color: "hsl(var(--text-muted))" }}>Medium</span>
                  <Input value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder="paid" style={{ ...monoInputStyle, fontSize: "11px" }} />
                </div>
                <div>
                  <span className="text-[10px] block mb-0.5" style={{ color: "hsl(var(--text-muted))" }}>Campaign</span>
                  <Input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder={campaignName.toLowerCase().replace(/\s+/g, "-")} style={{ ...monoInputStyle, fontSize: "11px" }} />
                </div>
                <div>
                  <span className="text-[10px] block mb-0.5" style={{ color: "hsl(var(--text-muted))" }}>Content</span>
                  <Input value={utmContent} onChange={e => setUtmContent(e.target.value)} placeholder={utmDynamic ? "{{ad.name}}" : "banner-hero"} style={{ ...monoInputStyle, fontSize: "11px" }} />
                </div>
                <div>
                  <span className="text-[10px] block mb-0.5" style={{ color: "hsl(var(--text-muted))" }}>Term</span>
                  <Input value={utmTerm} onChange={e => setUtmTerm(e.target.value)} placeholder={utmDynamic ? "{{adset.name}}" : ""} style={{ ...monoInputStyle, fontSize: "11px" }} />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block" style={labelStyle}>Peças aprovadas</Label>
              {loadingAssets ? (
                <div className="flex items-center gap-2 p-4">
                  <Loader2 size={16} className="animate-spin" style={{ color: "hsl(var(--text-muted))" }} />
                  <span className="text-xs" style={{ color: "hsl(var(--text-muted))" }}>Carregando peças...</span>
                </div>
              ) : approvedAssets.length === 0 ? (
                <div className="p-6 text-center rounded-lg" style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))" }}>
                  <ImageIcon size={24} className="mx-auto mb-2" style={{ color: "hsl(var(--text-muted))" }} />
                  <p className="text-xs" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
                    Nenhuma peça aprovada encontrada. Aprove peças antes de criar anúncios.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
                  {approvedAssets.map(asset => {
                    const selected = selectedAssetIds.has(asset.id);
                    const thumbUrl = sortRenders(asset.renders)[0]?.png_url;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleAsset(asset.id)}
                        className="relative text-left rounded-lg overflow-hidden transition-all"
                        style={{
                          background: "hsl(var(--bg-surface2))",
                          border: `2px solid ${selected ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                        }}
                      >
                        {thumbUrl ? (
                          <img src={thumbUrl} alt="" className="w-full h-20 object-cover" />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center" style={{ background: "hsl(var(--bg-surface3))" }}>
                            <ImageIcon size={16} style={{ color: "hsl(var(--text-muted))" }} />
                          </div>
                        )}
                        <div className="p-1.5">
                          <p className="text-[9px] truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                            {asset.name || "Sem nome"}
                          </p>
                        </div>
                        {selected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent))" }}>
                            <Check size={10} style={{ color: "hsl(var(--accent-foreground))" }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] mt-1" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace" }}>
                {selectedAssetIds.size} peça(s) selecionada(s)
              </p>
            </div>
          </div>
        )}

        {/* ═══ Step 5: Review ═══ */}
        {step === 5 && (
          <div className="space-y-3">
            <div className="rounded-lg p-4 space-y-2" style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))" }}>
              <h4 className="text-xs font-semibold" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>Resumo da Campanha</h4>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]" style={{ fontFamily: "'DM Sans'" }}>
                <span style={{ color: "hsl(var(--text-muted))" }}>Nome</span>
                <span style={{ color: "hsl(var(--text-primary))" }}>{activationSlug ? `${activationSlug} — ${campaignName}` : campaignName}</span>
                
                <span style={{ color: "hsl(var(--text-muted))" }}>Objetivo</span>
                <span style={{ color: "hsl(var(--text-primary))" }}>{OBJECTIVES.find(o => o.value === objective)?.label}</span>
                
                <span style={{ color: "hsl(var(--text-muted))" }}>Orçamento/dia</span>
                <span style={{ color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}>R$ {dailyBudget}</span>
                
                <span style={{ color: "hsl(var(--text-muted))" }}>Estratégia</span>
                <span style={{ color: "hsl(var(--text-primary))" }}>{BID_STRATEGIES.find(b => b.value === bidStrategy)?.label}</span>
                
                {(bidStrategy === "COST_CAP" || bidStrategy === "BID_CAP") && bidAmount && (
                  <>
                    <span style={{ color: "hsl(var(--text-muted))" }}>Valor lance</span>
                    <span style={{ color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}>R$ {bidAmount}</span>
                  </>
                )}
                
                {objConfig?.requiresPixel && pixelId && (
                  <>
                    <span style={{ color: "hsl(var(--text-muted))" }}>Pixel</span>
                    <span style={{ color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>{pixelId}</span>
                    <span style={{ color: "hsl(var(--text-muted))" }}>Evento</span>
                    <span style={{ color: "hsl(var(--text-primary))" }}>{CONVERSION_EVENTS.find(e => e.value === conversionEvent)?.label || conversionEvent}</span>
                  </>
                )}
                
                <span style={{ color: "hsl(var(--text-muted))" }}>Público</span>
                <span style={{ color: "hsl(var(--text-primary))" }}>{ageMin}–{ageMax} anos{genders.length > 0 ? `, ${genders.map(g => g === 1 ? "M" : "F").join("/")}` : ""}</span>
                
                <span style={{ color: "hsl(var(--text-muted))" }}>Posicionamento</span>
                <span style={{ color: "hsl(var(--text-primary))" }}>{placementMode === "automatic" ? "Automático" : "Manual"}</span>
                
                <span style={{ color: "hsl(var(--text-muted))" }}>CTA</span>
                <span style={{ color: "hsl(var(--text-primary))" }}>{CTA_OPTIONS.find(c => c.value === ctaType)?.label}</span>
                
                <span style={{ color: "hsl(var(--text-muted))" }}>Anúncios</span>
                <span style={{ color: "hsl(var(--accent))", fontWeight: 600 }}>{selectedAssetIds.size} peça(s)</span>
                
                {startDate && (
                  <>
                    <span style={{ color: "hsl(var(--text-muted))" }}>Período</span>
                    <span style={{ color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}>{startDate}{endDate ? ` → ${endDate}` : " → sem fim"}</span>
                  </>
                )}

                {destinationUrl && (
                  <>
                    <span style={{ color: "hsl(var(--text-muted))" }}>URL destino</span>
                    <span className="truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>{destinationUrl}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid hsl(var(--border-default))" }}>
          <div>
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={submitting} className="text-xs gap-1" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
                <ChevronLeft size={14} /> Voltar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={submitting} className="text-xs" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
              Cancelar
            </Button>

            {step < 5 ? (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="text-xs gap-1"
                style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", fontFamily: "'DM Sans'" }}
              >
                Próximo <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !canProceed()}
                className="text-xs gap-1"
                style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", fontFamily: "'DM Sans'" }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                {submitting ? "Criando..." : "Criar Campanha"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
