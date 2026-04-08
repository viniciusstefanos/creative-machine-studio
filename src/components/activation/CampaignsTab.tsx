import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Plus, RefreshCw, ChevronDown, ChevronRight, ExternalLink, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateCampaignWizard } from "./CreateCampaignWizard";
import { AddAdsToCampaignDialog } from "./AddAdsToCampaignDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface CampaignsTabProps {
  activationId: string;
}

export const CampaignsTab = ({ activationId }: CampaignsTabProps) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [creatives, setCreatives] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [addAdsOpen, setAddAdsOpen] = useState(false);
  const [addAdsPreselectedCampaign, setAddAdsPreselectedCampaign] = useState<string | null>(null);
  const [metaAccount, setMetaAccount] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [landingPageUrl, setLandingPageUrl] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activationSlug, setActivationSlug] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [metaCampaigns, setMetaCampaigns] = useState<any[]>([]);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);

    // Fetch campaigns
    const { data: camps } = await supabase
      .from("ad_campaigns")
      .select("*")
      .eq("activation_id", activationId)
      .order("created_at", { ascending: false });
    setCampaigns(camps || []);

    // Fetch all creatives for these campaigns
    if (camps && camps.length > 0) {
      const campIds = camps.map(c => c.id);
      const { data: allCreatives } = await supabase
        .from("ad_creatives")
        .select("*, assets(name, id)")
        .in("campaign_id", campIds);

      const grouped: Record<string, any[]> = {};
      (allCreatives || []).forEach(c => {
        if (!grouped[c.campaign_id]) grouped[c.campaign_id] = [];
        grouped[c.campaign_id].push(c);
      });
      setCreatives(grouped);
    }

    // Fetch meta credentials
    const { data: metaRes } = await supabase.functions.invoke("meta-ads", {
      body: { action: "get_client_meta", activation_id: activationId },
    });
    if (metaRes?.meta_account) setMetaAccount(metaRes.meta_account);

    // Fetch landing page url
    const { data: activation } = await supabase
      .from("activations")
      .select("landing_page_url, slug")
      .eq("id", activationId)
      .single();
    setLandingPageUrl(activation?.landing_page_url || null);
    setActivationSlug(activation?.slug || null);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activationId]);

  const syncStatus = async (campaign: any) => {
    if (!campaign.platform_campaign_id) return;
    setSyncing(campaign.id);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "get_campaign_status",
          platform_campaign_id: campaign.platform_campaign_id,
          page_access_token: metaAccount?.page_access_token,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      // Update local status
      const newStatus = data.campaign?.effective_status?.toLowerCase() || campaign.status;
      await supabase.from("ad_campaigns").update({ status: newStatus }).eq("id", campaign.id);
      toast.success("Status sincronizado");
      fetchData();
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + (err.message || ""));
    } finally {
      setSyncing(null);
    }
  };

  const handleOpenImport = async () => {
    if (!metaAccount?.ad_account_id) {
      toast.error("Conta de anúncio Meta não configurada");
      return;
    }
    setImportOpen(true);
    setImportLoading(true);
    setSelectedImports(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "list_campaigns",
          ad_account_id: metaAccount.ad_account_id,
          name_filter: activationSlug || "",
          page_access_token: metaAccount?.page_access_token,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      // Filter out campaigns already imported
      const existingPlatformIds = new Set(campaigns.map(c => c.platform_campaign_id).filter(Boolean));
      const newCampaigns = (data.campaigns || []).filter((c: any) => !existingPlatformIds.has(c.id));
      setMetaCampaigns(newCampaigns);
    } catch (err: any) {
      toast.error("Erro ao buscar campanhas: " + (err.message || ""));
      setMetaCampaigns([]);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportSelected = async () => {
    if (selectedImports.size === 0) return;
    setImportSaving(true);
    try {
      const toImport = metaCampaigns.filter(c => selectedImports.has(c.id));
      for (const camp of toImport) {
        const dailyBudgetCents = camp.daily_budget ? parseInt(camp.daily_budget) : null;
        await supabase.from("ad_campaigns").insert({
          activation_id: activationId,
          platform: "meta",
          name: camp.name,
          objective: camp.objective || null,
          status: (camp.effective_status || camp.status || "paused").toLowerCase(),
          platform_campaign_id: camp.id,
          ad_account_id: metaAccount?.ad_account_id,
          daily_budget_cents: dailyBudgetCents,
          start_date: camp.start_time ? camp.start_time.substring(0, 10) : null,
          end_date: camp.stop_time ? camp.stop_time.substring(0, 10) : null,
          adset_name: camp.adsets?.[0]?.name || null,
          platform_adset_id: camp.adsets?.[0]?.id || null,
        });
      }
      toast.success(`${toImport.length} campanha(s) importada(s)`);
      setImportOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error("Erro ao importar: " + (err.message || ""));
    } finally {
      setImportSaving(false);
    }
  };

  const toggleImportSelection = (id: string) => {
    setSelectedImports(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>
          Campanhas de Ads
          {activationSlug && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))", fontFamily: "'JetBrains Mono', monospace" }}>
              {activationSlug}
            </span>
          )}
        </SectionLabel>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs gap-1.5"
            style={{
              color: "hsl(var(--text-secondary))",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
              border: "1px solid hsl(var(--border-default))",
            }}
            onClick={handleOpenImport}
            disabled={!metaAccount?.ad_account_id}
          >
            <Download size={14} /> Importar do Meta
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs gap-1.5"
            style={{
              color: "hsl(var(--text-secondary))",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
              border: "1px solid hsl(var(--border-default))",
            }}
            onClick={() => { setAddAdsPreselectedCampaign(null); setAddAdsOpen(true); }}
          >
            <Upload size={14} /> Adicionar Anúncios
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5"
            style={{
              background: "hsl(var(--accent))",
              color: "hsl(var(--accent-foreground))",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
            }}
            onClick={() => setWizardOpen(true)}
          >
            <Plus size={14} /> Criar Campanha
          </Button>
        </div>
      </div>

      {!metaAccount?.ad_account_id && (
        <div className="p-3 rounded-lg text-xs mb-4" style={{ background: "hsl(var(--status-review) / 0.1)", color: "hsl(var(--status-review))", fontFamily: "'DM Sans'", borderRadius: 8 }}>
          ⚠ Conta de anúncio Meta não configurada neste cliente. Configure em Configurações do Cliente antes de criar campanhas.
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="p-8 rounded-lg text-center" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
          <Megaphone size={32} className="mx-auto mb-3" style={{ color: "hsl(var(--text-muted))" }} />
          <p className="text-sm mb-1" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>Nenhuma campanha de ads</p>
          <p className="text-[10px] mb-3" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
            Crie uma campanha para subir suas peças aprovadas ao Meta Ads
          </p>
          <Button
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="gap-1.5"
            style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", fontFamily: "'DM Sans'", borderRadius: 6 }}
          >
            <Plus size={14} /> Criar campanha
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const isExpanded = expandedId === campaign.id;
            const campCreatives = creatives[campaign.id] || [];

            return (
              <div
                key={campaign.id}
                className="rounded-lg overflow-hidden"
                style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}
              >
                {/* Campaign header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={14} style={{ color: "hsl(var(--text-muted))" }} /> : <ChevronRight size={14} style={{ color: "hsl(var(--text-muted))" }} />}
                    <div>
                      <p className="text-sm font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                        {campaign.name || "Campanha sem nome"}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                          {campaign.platform} · {campaign.objective || "—"}
                        </span>
                        {campaign.daily_budget_cents && (
                          <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                            R$ {(campaign.daily_budget_cents / 100).toFixed(2)}/dia
                          </span>
                        )}
                        {campaign.budget && !campaign.daily_budget_cents && (
                          <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                            R$ {Number(campaign.budget).toLocaleString("pt-BR")}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                          {campCreatives.length} anúncio(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={campaign.status} />
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4" style={{ borderTop: "1px solid hsl(var(--border-default))" }}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-4">
                        {campaign.start_date && (
                          <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                            Início: {campaign.start_date}
                          </span>
                        )}
                        {campaign.end_date && (
                          <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                            Fim: {campaign.end_date}
                          </span>
                        )}
                        {campaign.platform_campaign_id && (
                          <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                            ID: {campaign.platform_campaign_id}
                          </span>
                        )}
                      </div>
                      {campaign.platform_campaign_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] gap-1 h-7"
                          style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}
                          onClick={(e) => { e.stopPropagation(); syncStatus(campaign); }}
                          disabled={syncing === campaign.id}
                        >
                          <RefreshCw size={12} className={syncing === campaign.id ? "animate-spin" : ""} />
                          Sincronizar
                        </Button>
                      )}
                    </div>

                    {/* Adset info */}
                    {campaign.adset_name && (
                      <div className="mb-3 p-2 rounded" style={{ background: "hsl(var(--bg-surface2))" }}>
                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                          Conjunto de Anúncios
                        </p>
                        <p className="text-xs" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                          {campaign.adset_name}
                        </p>
                      </div>
                    )}

                    {/* Creatives list */}
                    {campCreatives.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                            Anúncios ({campCreatives.length})
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[10px] gap-1 h-6"
                            style={{ color: "hsl(var(--accent))", fontFamily: "'DM Sans'" }}
                            onClick={(e) => { e.stopPropagation(); setAddAdsPreselectedCampaign(campaign.id); setAddAdsOpen(true); }}
                          >
                            <Plus size={10} /> Adicionar
                          </Button>
                        </div>
                        {campCreatives.map(creative => (
                          <div
                            key={creative.id}
                            className="flex items-center justify-between p-2 rounded"
                            style={{ background: "hsl(var(--bg-surface2))" }}
                          >
                            <div>
                              <p className="text-xs" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                                {creative.name || "Anúncio"}
                              </p>
                              {creative.caption && (
                                <p className="text-[10px] truncate max-w-[300px] mt-0.5" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
                                  {creative.caption.substring(0, 60)}...
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={creative.status} />
                              {creative.asset_id && (
                                <a
                                  href={`/assets/${creative.asset_id}`}
                                  className="text-[10px] flex items-center gap-1"
                                  style={{ color: "hsl(var(--accent))" }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink size={10} /> Ver peça
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-[10px]" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
                          Nenhum anúncio vinculado
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[10px] gap-1 h-7"
                          style={{ color: "hsl(var(--accent))", fontFamily: "'DM Sans'" }}
                          onClick={(e) => { e.stopPropagation(); setAddAdsPreselectedCampaign(campaign.id); setAddAdsOpen(true); }}
                        >
                          <Plus size={10} /> Adicionar anúncio
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateCampaignWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        activationId={activationId}
        metaAccount={metaAccount}
        landingPageUrl={landingPageUrl}
        onCreated={fetchData}
      />

      <AddAdsToCampaignDialog
        open={addAdsOpen}
        onOpenChange={setAddAdsOpen}
        activationId={activationId}
        metaAccount={metaAccount}
        landingPageUrl={landingPageUrl}
        preSelectedCampaignId={addAdsPreselectedCampaign}
        onCreated={fetchData}
      />
    </div>
  );
};
