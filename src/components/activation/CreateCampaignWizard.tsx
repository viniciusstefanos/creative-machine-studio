import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check, ChevronRight, ChevronLeft, Image as ImageIcon } from "lucide-react";

interface CreateCampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activationId: string;
  metaAccount: {
    ad_account_id: string | null;
    page_access_token: string | null;
    instagram_page_id: string | null;
    facebook_page_id: string | null;
  } | null;
  landingPageUrl?: string | null;
  onCreated: () => void;
}

const OBJECTIVES = [
  { value: "OUTCOME_ENGAGEMENT", label: "Engajamento" },
  { value: "OUTCOME_TRAFFIC", label: "Tráfego" },
  { value: "OUTCOME_AWARENESS", label: "Reconhecimento" },
  { value: "OUTCOME_LEADS", label: "Leads" },
  { value: "OUTCOME_SALES", label: "Vendas" },
];

interface ApprovedAsset {
  id: string;
  name: string;
  copy_id: string | null;
  renders: { png_url: string | null; slide_index: number }[];
  copy?: { hook: string | null; full_copy: string | null };
}

const sortRenders = (renders: { png_url: string | null; slide_index: number }[]) =>
  [...renders].sort((a, b) => (a.slide_index ?? 0) - (b.slide_index ?? 0));

export const CreateCampaignWizard = ({
  open, onOpenChange, activationId, metaAccount, landingPageUrl, onCreated,
}: CreateCampaignWizardProps) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Campaign
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_ENGAGEMENT");
  const [dailyBudget, setDailyBudget] = useState("20");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 2: Targeting
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [genders, setGenders] = useState<number[]>([]);
  const [interests, setInterests] = useState("");

  // Step 3: Ads
  const [approvedAssets, setApprovedAssets] = useState<ApprovedAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    if (open && step === 3) {
      loadApprovedAssets();
    }
  }, [open, step]);

  const loadApprovedAssets = async () => {
    setLoadingAssets(true);
    const { data: assets } = await supabase
      .from("assets")
      .select("id, name, copy_id")
      .eq("activation_id", activationId)
      .eq("status", "approved");

    if (!assets || assets.length === 0) {
      setApprovedAssets([]);
      setLoadingAssets(false);
      return;
    }

    // Fetch renders for each asset
    const assetIds = assets.map(a => a.id);
    const { data: renders } = await supabase
      .from("asset_template_renders")
      .select("asset_id, png_url, slide_index")
      .in("asset_id", assetIds);

    // Fetch copies
    const copyIds = assets.filter(a => a.copy_id).map(a => a.copy_id!);
    let copiesMap: Record<string, { hook: string | null; full_copy: string | null }> = {};
    if (copyIds.length > 0) {
      const { data: copies } = await supabase
        .from("copies")
        .select("id, hook, full_copy")
        .in("id", copyIds);
      if (copies) {
        copiesMap = Object.fromEntries(copies.map(c => [c.id, { hook: c.hook, full_copy: c.full_copy }]));
      }
    }

    const enriched: ApprovedAsset[] = assets.map(a => ({
      ...a,
      renders: sortRenders(
        (renders || [])
          .filter(r => r.asset_id === a.id)
          .map(r => ({ png_url: r.png_url, slide_index: r.slide_index ?? 0 }))
      ),
      copy: a.copy_id ? copiesMap[a.copy_id] : undefined,
    }));

    setApprovedAssets(enriched);
    setSelectedAssetIds(new Set(enriched.map(a => a.id)));
    setLoadingAssets(false);
  };

  const toggleAsset = (id: string) => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const canProceed = () => {
    if (step === 1) return campaignName.trim().length > 0 && !!metaAccount?.ad_account_id;
    if (step === 2) return true;
    if (step === 3) return selectedAssetIds.size > 0;
    return false;
  };

  const handleSubmit = async () => {
    if (!metaAccount?.ad_account_id) {
      toast.error("Conta de anúncio Meta não configurada");
      return;
    }

    setSubmitting(true);
    try {
      const budgetCents = Math.round(parseFloat(dailyBudget) * 100);

      // 1. Create campaign
      const { data: campRes, error: campErr } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "create_campaign",
          ad_account_id: metaAccount.ad_account_id,
          name: campaignName,
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

      // 2. Create adset
      const { data: adsetRes, error: adsetErr } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "create_adset",
          ad_account_id: metaAccount.ad_account_id,
          campaign_id: platformCampaignId,
          name: `${campaignName} — Conjunto`,
          daily_budget: budgetCents,
          optimization_goal: objective === "OUTCOME_TRAFFIC" ? "LINK_CLICKS" : "REACH",
          age_min: parseInt(ageMin),
          age_max: parseInt(ageMax),
          genders: genders.length > 0 ? genders : undefined,
          targeting: {
            geo_locations: { countries: ["BR"] },
          },
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          page_access_token: metaAccount.page_access_token,
          db_campaign_id: dbCampaignId,
        },
      });
      if (adsetErr) throw new Error(adsetErr.message);
      if (adsetRes?.error) throw new Error(adsetRes.error);

      const adsetId = adsetRes.adset_id;

      // 3. Create ads for each selected asset
      const selectedAssets = approvedAssets.filter(a => selectedAssetIds.has(a.id));
      let successCount = 0;

      for (const asset of selectedAssets) {
        const imageUrls = sortRenders(asset.renders)
          .map(render => render.png_url)
          .filter((url): url is string => Boolean(url));

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
              link: landingPageUrl || "https://example.com",
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

      // Reset
      setStep(1);
      setCampaignName("");
      setObjective("OUTCOME_ENGAGEMENT");
      setDailyBudget("20");
      setStartDate("");
      setEndDate("");
    } catch (err: any) {
      console.error("Campaign creation error:", err);
      toast.error(err.message || "Erro ao criar campanha");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl"
        style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))" }}
      >
        <DialogHeader>
          <DialogTitle className="text-display-sm" style={{ color: "hsl(var(--text-primary))" }}>
            Criar Campanha Meta Ads
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  background: s <= step ? "hsl(var(--accent))" : "hsl(var(--bg-surface2))",
                  color: s <= step ? "hsl(var(--accent-foreground))" : "hsl(var(--text-muted))",
                }}
              >
                {s < step ? <Check size={14} /> : s}
              </div>
              {s < 3 && (
                <div className="w-8 h-px" style={{ background: s < step ? "hsl(var(--accent))" : "hsl(var(--border-default))" }} />
              )}
            </div>
          ))}
          <span className="ml-3 text-xs" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
            {step === 1 ? "Campanha" : step === 2 ? "Segmentação" : "Anúncios"}
          </span>
        </div>

        {/* Step 1: Campaign */}
        {step === 1 && (
          <div className="space-y-4">
            {!metaAccount?.ad_account_id && (
              <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--status-rejected) / 0.1)", color: "hsl(var(--status-rejected))", fontFamily: "'DM Sans'" }}>
                ⚠ Conta de anúncio Meta não configurada. Vá em Configurações do Cliente para adicionar.
              </div>
            )}

            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Nome da campanha</Label>
              <Input
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="Ex: Black Friday 2026"
                style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}
              />
            </div>

            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Objetivo</Label>
              <div className="grid grid-cols-2 gap-2">
                {OBJECTIVES.map(obj => (
                  <button
                    key={obj.value}
                    type="button"
                    onClick={() => setObjective(obj.value)}
                    className="px-3 py-2 rounded-md text-xs text-left transition-all"
                    style={{
                      background: objective === obj.value ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                      border: `1px solid ${objective === obj.value ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                      color: objective === obj.value ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                      fontFamily: "'DM Sans'",
                    }}
                  >
                    {obj.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Orçamento diário (R$)</Label>
                <Input
                  type="number"
                  value={dailyBudget}
                  onChange={e => setDailyBudget(e.target.value)}
                  min={1}
                  style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Targeting */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Idade mín.</Label>
                <Input
                  type="number"
                  value={ageMin}
                  onChange={e => setAgeMin(e.target.value)}
                  min={13} max={65}
                  style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Idade máx.</Label>
                <Input
                  type="number"
                  value={ageMax}
                  onChange={e => setAgeMax(e.target.value)}
                  min={13} max={65}
                  style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Gênero</Label>
              <div className="flex gap-2">
                {[
                  { value: 0, label: "Todos" },
                  { value: 1, label: "Masculino" },
                  { value: 2, label: "Feminino" },
                ].map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => {
                      if (g.value === 0) setGenders([]);
                      else setGenders(prev => prev.includes(g.value) ? prev.filter(x => x !== g.value) : [...prev, g.value]);
                    }}
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
              <Label className="text-xs mb-1.5 block" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Interesses (separados por vírgula)</Label>
              <Textarea
                value={interests}
                onChange={e => setInterests(e.target.value)}
                placeholder="Ex: fitness, nutrição, bem-estar"
                rows={2}
                style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}
              />
              <p className="text-[10px] mt-1" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
                Nota: interesses serão enviados como texto livre na segmentação
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Ads */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
              Selecione as peças aprovadas que serão enviadas como anúncios:
            </p>

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
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {approvedAssets.map(asset => {
                  const selected = selectedAssetIds.has(asset.id);
                  const thumbUrl = sortRenders(asset.renders)[0]?.png_url;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => toggleAsset(asset.id)}
                      className="text-left rounded-lg overflow-hidden transition-all"
                      style={{
                        background: "hsl(var(--bg-surface2))",
                        border: `2px solid ${selected ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                      }}
                    >
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="" className="w-full h-28 object-cover" />
                      ) : (
                        <div className="w-full h-28 flex items-center justify-center" style={{ background: "hsl(var(--bg-surface3))" }}>
                          <ImageIcon size={20} style={{ color: "hsl(var(--text-muted))" }} />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-[10px] truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                          {asset.name || "Sem nome"}
                        </p>
                        {asset.copy?.hook && (
                          <p className="text-[9px] truncate mt-0.5" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
                            {asset.copy.hook}
                          </p>
                        )}
                      </div>
                      {selected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent))" }}>
                          <Check size={12} style={{ color: "hsl(var(--accent-foreground))" }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[10px]" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace" }}>
              {selectedAssetIds.size} peça(s) selecionada(s)
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid hsl(var(--border-default))" }}>
          <div>
            {step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(s => s - 1)}
                disabled={submitting}
                className="text-xs gap-1"
                style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}
              >
                <ChevronLeft size={14} /> Voltar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs"
              style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}
            >
              Cancelar
            </Button>

            {step < 3 ? (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="text-xs gap-1"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  fontFamily: "'DM Sans'",
                }}
              >
                Próximo <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !canProceed()}
                className="text-xs gap-1"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  fontFamily: "'DM Sans'",
                }}
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
