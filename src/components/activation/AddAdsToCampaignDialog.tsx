import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check, ImageIcon, Plus, X, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AddAdsDialogProps {
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
  preSelectedCampaignId?: string | null;
  onCreated: () => void;
}

interface Campaign {
  id: string;
  name: string;
  platform_adset_id: string;
  ad_account_id: string | null;
}

interface ApprovedAsset {
  id: string;
  name: string;
  copy_id: string | null;
  renders: { png_url: string | null; slide_index: number }[];
  copy?: { hook: string | null; full_copy: string | null };
}

const sortRenders = (renders: { png_url: string | null; slide_index: number }[]) =>
  [...renders].sort((a, b) => (a.slide_index ?? 0) - (b.slide_index ?? 0));

export const AddAdsToCampaignDialog = ({
  open, onOpenChange, activationId, metaAccount, landingPageUrl, preSelectedCampaignId, onCreated,
}: AddAdsDialogProps) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [approvedAssets, setApprovedAssets] = useState<ApprovedAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitTotal, setSubmitTotal] = useState(0);
  const [assetResults, setAssetResults] = useState<Record<string, "ok" | "error">>({});

  useEffect(() => {
    if (open) {
      loadCampaigns();
      loadApprovedAssets();
    }
  }, [open]);

  useEffect(() => {
    if (preSelectedCampaignId) setSelectedCampaignId(preSelectedCampaignId);
  }, [preSelectedCampaignId]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from("ad_campaigns")
      .select("id, name, platform_adset_id, ad_account_id")
      .eq("activation_id", activationId)
      .not("platform_adset_id", "is", null)
      .order("created_at", { ascending: false });
    setCampaigns((data || []) as Campaign[]);
    if (preSelectedCampaignId) {
      setSelectedCampaignId(preSelectedCampaignId);
    } else if (data && data.length === 1) {
      setSelectedCampaignId(data[0].id);
    }
  };

  const loadApprovedAssets = async () => {
    setLoading(true);
    const { data: assets } = await supabase
      .from("assets")
      .select("id, name, copy_id")
      .eq("activation_id", activationId)
      .eq("status", "approved");

    if (!assets || assets.length === 0) {
      setApprovedAssets([]);
      setLoading(false);
      return;
    }

    const assetIds = assets.map(a => a.id);
    const { data: renders } = await supabase
      .from("asset_template_renders")
      .select("asset_id, png_url, slide_index")
      .in("asset_id", assetIds);

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
    setLoading(false);
  };

  const toggleAsset = (id: string) => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedAssetIds(new Set(approvedAssets.map(a => a.id)));
  const clearAll = () => setSelectedAssetIds(new Set());

  const handleSubmit = async () => {
    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (!campaign || !metaAccount?.ad_account_id) {
      toast.error("Selecione uma campanha com adset configurado");
      return;
    }

    setSubmitting(true);
    const selectedAssets = approvedAssets.filter(a => selectedAssetIds.has(a.id));
    setSubmitTotal(selectedAssets.length);
    setSubmitProgress(0);
    setAssetResults({});
    let successCount = 0;

    for (const asset of selectedAssets) {
      const imageUrls = sortRenders(asset.renders)
        .map(r => r.png_url)
        .filter((url): url is string => Boolean(url));

      if (imageUrls.length === 0) continue;

      try {
        const { data: adRes, error: adErr } = await supabase.functions.invoke("meta-ads", {
          body: {
            action: "create_ad",
            ad_account_id: campaign.ad_account_id || metaAccount.ad_account_id,
            adset_id: campaign.platform_adset_id,
            name: asset.name || `Ad ${successCount + 1}`,
            image_url: imageUrls[0],
            image_urls: imageUrls,
            caption: asset.copy?.full_copy || asset.copy?.hook || "",
            link: landingPageUrl || "https://example.com",
            instagram_page_id: metaAccount.instagram_page_id,
            facebook_page_id: metaAccount.facebook_page_id,
            page_access_token: metaAccount.page_access_token,
            db_campaign_id: campaign.id,
            asset_id: asset.id,
          },
        });
        if (!adErr && !adRes?.error) {
          successCount++;
          setAssetResults(prev => ({ ...prev, [asset.id]: "ok" }));
        } else {
          console.error(`Ad error for ${asset.id}:`, adRes?.error || adErr);
          setAssetResults(prev => ({ ...prev, [asset.id]: "error" }));
        }
      } catch (e) {
        console.error(`Failed to create ad for asset ${asset.id}:`, e);
        setAssetResults(prev => ({ ...prev, [asset.id]: "error" }));
      }
      setSubmitProgress(prev => prev + 1);
    }

    if (successCount > 0) {
      toast.success(`${successCount} anúncio(s) adicionado(s) à campanha`);
      onOpenChange(false);
      onCreated();
    } else {
      toast.error("Nenhum anúncio foi criado. Verifique os logs.");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl"
        style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))" }}
      >
        <DialogHeader>
          <DialogTitle className="text-display-sm" style={{ color: "hsl(var(--text-primary))" }}>
            Adicionar Anúncios a Campanha
          </DialogTitle>
        </DialogHeader>

        {/* Select campaign */}
        <div className="space-y-3">
          <p className="text-xs font-medium" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
            Campanha destino
          </p>
          {campaigns.length === 0 ? (
            <p className="text-xs" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
              Nenhuma campanha com adset criado. Crie uma campanha primeiro.
            </p>
          ) : (
            <div className="space-y-2 max-h-[120px] overflow-y-auto">
              {campaigns.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCampaignId(c.id)}
                  className="w-full text-left px-3 py-2 rounded-md text-xs transition-all"
                  style={{
                    background: selectedCampaignId === c.id ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                    border: `1px solid ${selectedCampaignId === c.id ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                    color: selectedCampaignId === c.id ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                    fontFamily: "'DM Sans'",
                  }}
                >
                  {c.name || "Campanha sem nome"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Select assets */}
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
              Peças aprovadas ({selectedAssetIds.size}/{approvedAssets.length})
            </p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[10px] underline" style={{ color: "hsl(var(--accent))", fontFamily: "'DM Sans'" }}>
                Selecionar tudo
              </button>
              <button onClick={clearAll} className="text-[10px] underline" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
                Limpar
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin" style={{ color: "hsl(var(--accent))" }} />
            </div>
          ) : approvedAssets.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
              Nenhuma peça aprovada com render disponível
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto">
              {approvedAssets.map(asset => {
                const isSelected = selectedAssetIds.has(asset.id);
                const thumbUrl = asset.renders[0]?.png_url;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggleAsset(asset.id)}
                    className="relative rounded-md overflow-hidden group transition-all"
                    style={{
                      border: `2px solid ${isSelected ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                      aspectRatio: "1",
                    }}
                  >
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={asset.name || ""} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(var(--bg-surface2))" }}>
                        <ImageIcon size={20} style={{ color: "hsl(var(--text-muted))" }} />
                      </div>
                    )}
                    {isSelected && (
                      <div
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "hsl(var(--accent))" }}
                      >
                        <Check size={12} style={{ color: "hsl(var(--accent-foreground))" }} />
                      </div>
                    )}
                    {assetResults[asset.id] === "ok" && (
                      <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(142 71% 45%)" }}>
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    {assetResults[asset.id] === "error" && (
                      <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(0 84% 60%)" }}>
                        <X size={12} className="text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1" style={{ background: "hsla(var(--bg-base) / 0.8)" }}>
                      <p className="text-[9px] truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}>
                        {asset.name || "Peça"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Progress */}
        {submitting && submitTotal > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px]" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace" }}>
              <span>Subindo {submitProgress} de {submitTotal}</span>
              <span>{Math.round((submitProgress / submitTotal) * 100)}%</span>
            </div>
            <Progress value={(submitProgress / submitTotal) * 100} className="h-1.5" />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!selectedCampaignId || selectedAssetIds.size === 0 || submitting}
            className="gap-1.5"
            style={{
              background: "hsl(var(--accent))",
              color: "hsl(var(--accent-foreground))",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
            }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {submitting ? "Subindo..." : `Subir ${selectedAssetIds.size} anúncio(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
