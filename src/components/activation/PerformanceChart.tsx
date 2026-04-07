import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Trophy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PerformanceChartProps {
  activationId: string;
}

export const PerformanceChart = ({ activationId }: PerformanceChartProps) => {
  const [dailyMetrics, setDailyMetrics] = useState<any[]>([]);
  const [assetMetrics, setAssetMetrics] = useState<any[]>([]);
  const [bestAsset, setBestAsset] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: metrics } = await supabase
        .from("metrics")
        .select("*, assets(category, asset_templates(name))")
        .eq("activation_id", activationId)
        .order("date", { ascending: true });

      if (!metrics || metrics.length === 0) return;

      // Daily aggregation
      const byDate: Record<string, any> = {};
      metrics.forEach((m) => {
        const d = m.date || "unknown";
        if (!byDate[d]) byDate[d] = { date: d, likes: 0, comments: 0, shares: 0, saves: 0, spend: 0 };
        byDate[d].likes += m.likes || 0;
        byDate[d].comments += m.comments_count || 0;
        byDate[d].shares += m.shares || 0;
        byDate[d].saves += m.saves || 0;
        byDate[d].spend += m.spend || 0;
      });
      setDailyMetrics(Object.values(byDate));

      // Per-asset aggregation
      const byAsset: Record<string, any> = {};
      metrics.forEach((m) => {
        const aid = m.asset_id || "unknown";
        if (!byAsset[aid]) byAsset[aid] = { id: aid, name: (m as any).assets?.asset_templates?.name || (m as any).assets?.category || "—", engagement: 0, spend: 0, results: 0 };
        byAsset[aid].engagement += (m.likes || 0) + (m.comments_count || 0) + (m.shares || 0) + (m.saves || 0);
        byAsset[aid].spend += m.spend || 0;
        byAsset[aid].results += m.results || 0;
      });
      const assetList = Object.values(byAsset).sort((a: any, b: any) => b.engagement - a.engagement);
      setAssetMetrics(assetList);
      if (assetList.length > 0) setBestAsset(assetList[0]);
    };
    fetch();
  }, [activationId]);

  const exportCSV = () => {
    if (dailyMetrics.length === 0) return;
    const headers = "Data,Curtidas,Comentários,Compartilhamentos,Salvos,Investido\n";
    const rows = dailyMetrics.map((m) => `${m.date},${m.likes},${m.comments},${m.shares},${m.saves},${m.spend}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricas-${activationId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  if (dailyMetrics.length === 0 && assetMetrics.length === 0) return null;

  return (
    <div className="space-y-6 mt-6">
      {/* Best asset */}
      {bestAsset && (
        <div className="card-base flex items-center gap-4" style={{ borderColor: "hsl(var(--accent))" }}>
          <Trophy size={24} style={{ color: "hsl(var(--accent))" }} />
          <div className="flex-1">
            <p className="text-mono-label">Melhor Peça</p>
            <p className="text-heading">{bestAsset.name}</p>
          </div>
          <div className="text-right">
            <p className="text-mono-label">Engajamento total</p>
            <p className="text-display-lg !text-xl">{bestAsset.engagement.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      )}

      {/* Daily timeline */}
      {dailyMetrics.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Métricas Diárias</SectionLabel>
            <Button variant="ghost" size="sm" className="gap-2" onClick={exportCSV}>
              <Download size={14} /> CSV
            </Button>
          </div>
          <div className="card-base" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", borderRadius: 6, fontSize: 11 }} />
                <Line type="monotone" dataKey="likes" name="Curtidas" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="comments" name="Comentários" stroke="hsl(var(--status-review))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="shares" name="Compartilhamentos" stroke="hsl(var(--status-scheduled))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-asset comparison */}
      {assetMetrics.length > 1 && (
        <div>
          <SectionLabel>Comparativo por Peça</SectionLabel>
          <div className="card-base mt-3" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetMetrics.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="engagement" name="Engajamento" fill="hsl(var(--accent))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
