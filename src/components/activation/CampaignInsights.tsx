import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, TrendingDown, Eye, MousePointer,
  DollarSign, Target, RefreshCw, Users, Loader2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";

interface CampaignInsightsProps {
  activationId: string;
  metaAccount: {
    ad_account_id: string | null;
    page_access_token: string | null;
  } | null;
  campaigns: { id: string; name: string; platform_campaign_id: string | null }[];
}

interface InsightSummary {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  results: number;
  costPerResult: number;
}

interface DailyPoint {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
}

interface AdInsight {
  ad_id: string;
  ad_name: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: string;
  cpc: string;
  results: number;
  costPerResult: number;
}

const DATE_PRESETS = [
  { value: "last_7d", label: "7 dias" },
  { value: "last_14d", label: "14 dias" },
  { value: "last_30d", label: "30 dias" },
  { value: "this_month", label: "Mês atual" },
  { value: "last_month", label: "Mês passado" },
];

const extractResults = (actions: any[] | undefined) => {
  if (!actions) return 0;
  const result = actions.find((a: any) => 
    a.action_type === "offsite_conversion.fb_pixel_purchase" ||
    a.action_type === "lead" ||
    a.action_type === "link_click" ||
    a.action_type === "landing_page_view"
  );
  return result ? parseInt(result.value) : 0;
};

const extractCPR = (costPerAction: any[] | undefined) => {
  if (!costPerAction) return 0;
  const result = costPerAction.find((a: any) =>
    a.action_type === "offsite_conversion.fb_pixel_purchase" ||
    a.action_type === "lead" ||
    a.action_type === "link_click" ||
    a.action_type === "landing_page_view"
  );
  return result ? parseFloat(result.value) : 0;
};

export const CampaignInsights = ({ activationId, metaAccount, campaigns }: CampaignInsightsProps) => {
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState("last_30d");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [adInsights, setAdInsights] = useState<AdInsight[]>([]);
  const [viewMode, setViewMode] = useState<"campaign" | "creative">("campaign");

  const metaCampaigns = campaigns.filter(c => c.platform_campaign_id);

  useEffect(() => {
    if (metaCampaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(metaCampaigns[0].id);
    }
  }, [campaigns]);

  useEffect(() => {
    if (selectedCampaignId) fetchInsights();
  }, [selectedCampaignId, datePreset]);

  const fetchInsights = async () => {
    const campaign = metaCampaigns.find(c => c.id === selectedCampaignId);
    if (!campaign?.platform_campaign_id || !metaAccount?.ad_account_id) return;

    setLoading(true);
    try {
      // Fetch campaign-level insights
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "get_insights",
          object_id: campaign.platform_campaign_id,
          date_preset: datePreset,
          page_access_token: metaAccount.page_access_token,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      const s = data.summary;
      if (s) {
        setSummary({
          impressions: parseInt(s.impressions || "0"),
          reach: parseInt(s.reach || "0"),
          clicks: parseInt(s.clicks || "0"),
          spend: parseFloat(s.spend || "0"),
          ctr: parseFloat(s.ctr || "0"),
          cpc: parseFloat(s.cpc || "0"),
          cpm: parseFloat(s.cpm || "0"),
          frequency: parseFloat(s.frequency || "0"),
          results: extractResults(s.actions),
          costPerResult: extractCPR(s.cost_per_action_type),
        });
      } else {
        setSummary(null);
      }

      setDaily(
        (data.daily || []).map((d: any) => ({
          date: d.date_start?.substring(5) || "",
          impressions: parseInt(d.impressions || "0"),
          clicks: parseInt(d.clicks || "0"),
          spend: parseFloat(d.spend || "0"),
          ctr: parseFloat(d.ctr || "0"),
        }))
      );

      // Fetch ad-level insights
      const { data: adData } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "get_ad_insights",
          ad_account_id: metaAccount.ad_account_id,
          campaign_id: campaign.platform_campaign_id,
          date_preset: datePreset,
          page_access_token: metaAccount.page_access_token,
        },
      });

      if (adData?.ads) {
        setAdInsights(
          adData.ads.map((a: any) => ({
            ad_id: a.ad_id,
            ad_name: a.ad_name,
            impressions: parseInt(a.impressions || "0"),
            reach: parseInt(a.reach || "0"),
            clicks: parseInt(a.clicks || "0"),
            spend: parseFloat(a.spend || "0"),
            ctr: a.ctr || "0",
            cpc: a.cpc || "0",
            results: extractResults(a.actions),
            costPerResult: extractCPR(a.cost_per_action_type),
          }))
        );
      }
    } catch (err: any) {
      toast.error("Erro ao buscar insights: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const fmtNumber = (n: number) => n.toLocaleString("pt-BR");
  const fmtCurrency = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = (n: number) => `${n.toFixed(2)}%`;

  if (metaCampaigns.length === 0) {
    return (
      <div className="p-6 rounded-lg text-center" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
        <BarChart3 size={28} className="mx-auto mb-2" style={{ color: "hsl(var(--text-muted))" }} />
        <p className="text-xs" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
          Nenhuma campanha vinculada ao Meta para exibir insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {metaCampaigns.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCampaignId(c.id)}
              className="px-3 py-1.5 rounded-md text-xs transition-all"
              style={{
                background: selectedCampaignId === c.id ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                border: `1px solid ${selectedCampaignId === c.id ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                color: selectedCampaignId === c.id ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                fontFamily: "'DM Sans'",
                borderRadius: 6,
              }}
            >
              {c.name || "Campanha"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {DATE_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setDatePreset(p.value)}
              className="px-2 py-1 rounded text-[10px] transition-all"
              style={{
                background: datePreset === p.value ? "hsl(var(--accent) / 0.15)" : "transparent",
                color: datePreset === p.value ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {p.label}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] gap-1"
            style={{ color: "hsl(var(--text-muted))" }}
            onClick={fetchInsights}
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--accent))" }} />
        </div>
      ) : !summary ? (
        <div className="p-6 rounded-lg text-center" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
          <p className="text-xs" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
            Sem dados de performance para o período selecionado.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Eye, label: "Impressões", value: fmtNumber(summary.impressions), sub: `Alcance: ${fmtNumber(summary.reach)}` },
              { icon: MousePointer, label: "Cliques", value: fmtNumber(summary.clicks), sub: `CTR: ${fmtPct(summary.ctr)}` },
              { icon: DollarSign, label: "Investido", value: fmtCurrency(summary.spend), sub: `CPC: ${fmtCurrency(summary.cpc)}` },
              { icon: Target, label: "Resultados", value: fmtNumber(summary.results), sub: summary.costPerResult > 0 ? `CPR: ${fmtCurrency(summary.costPerResult)}` : `CPM: ${fmtCurrency(summary.cpm)}` },
            ].map(kpi => (
              <div
                key={kpi.label}
                className="p-4 rounded-lg"
                style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon size={14} style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                    {kpi.label}
                  </span>
                </div>
                <p className="text-lg font-semibold" style={{ color: "hsl(var(--text-primary))", fontFamily: "'Syne'" }}>
                  {kpi.value}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace" }}>
                  {kpi.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Extra KPIs row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>Frequência</p>
              <p className="text-sm font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>{summary.frequency.toFixed(2)}x</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>CPM</p>
              <p className="text-sm font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>{fmtCurrency(summary.cpm)}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>CPC Médio</p>
              <p className="text-sm font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>{fmtCurrency(summary.cpc)}</p>
            </div>
          </div>

          {/* Chart */}
          {daily.length > 0 && (
            <div className="p-4 rounded-lg" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                  Performance diária
                </p>
                <div className="flex gap-1">
                  {(["campaign", "creative"] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setViewMode(v)}
                      className="px-2 py-0.5 rounded text-[9px] transition-all"
                      style={{
                        background: viewMode === v ? "hsl(var(--accent) / 0.15)" : "transparent",
                        color: viewMode === v ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {v === "campaign" ? "Campanha" : "Por criativo"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--bg-surface2))",
                        border: "1px solid hsl(var(--border-default))",
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: "'DM Sans'",
                      }}
                    />
                    <Area type="monotone" dataKey="spend" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.15)" name="Investido (R$)" />
                    <Area type="monotone" dataKey="clicks" stroke="hsl(210 80% 60%)" fill="hsl(210 80% 60% / 0.1)" name="Cliques" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Ad-level insights (creative breakdown) */}
          {viewMode === "creative" && adInsights.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                Performance por criativo ({adInsights.length})
              </p>
              <div className="space-y-2">
                {adInsights
                  .sort((a, b) => b.spend - a.spend)
                  .map(ad => {
                    const bestCtr = Math.max(...adInsights.map(a => parseFloat(a.ctr)));
                    const isBest = parseFloat(ad.ctr) === bestCtr && adInsights.length > 1;
                    return (
                      <div
                        key={ad.ad_id}
                        className="p-3 rounded-lg flex items-center justify-between"
                        style={{
                          background: "hsl(var(--bg-surface1))",
                          border: `1px solid ${isBest ? "hsl(var(--accent) / 0.4)" : "hsl(var(--border-default))"}`,
                          borderRadius: 8,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                              {ad.ad_name}
                            </p>
                            {isBest && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))", fontFamily: "'JetBrains Mono', monospace" }}>
                                <TrendingUp size={9} /> melhor CTR
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                              {fmtNumber(ad.impressions)} imp
                            </span>
                            <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                              {fmtNumber(ad.clicks)} cliques
                            </span>
                            <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                              CTR {parseFloat(ad.ctr).toFixed(2)}%
                            </span>
                            <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                              CPC {fmtCurrency(parseFloat(ad.cpc))}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                            {fmtCurrency(ad.spend)}
                          </p>
                          {ad.results > 0 && (
                            <p className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--accent))" }}>
                              {ad.results} resultados
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
