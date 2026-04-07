import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PerformanceChart } from "./PerformanceChart";

interface AnalyticsTabProps {
  activationId: string;
}

export const AnalyticsTab = ({ activationId }: AnalyticsTabProps) => {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("metrics")
        .select("*")
        .eq("activation_id", activationId)
        .order("date", { ascending: false })
        .limit(30);
      setMetrics(data || []);
      setLoading(false);
    };
    fetch();
  }, [activationId]);

  const totals = metrics.reduce(
    (acc, m) => ({
      likes: acc.likes + (m.likes || 0),
      comments: acc.comments + (m.comments_count || 0),
      shares: acc.shares + (m.shares || 0),
      saves: acc.saves + (m.saves || 0),
      spend: acc.spend + (m.spend || 0),
      results: acc.results + (m.results || 0),
    }),
    { likes: 0, comments: 0, shares: 0, saves: 0, spend: 0, results: 0 }
  );

  const approvalRate = () => {
    // We don't have approval data here, just show totals
    return null;
  };

  const exportCSV = () => {
    if (metrics.length === 0) return;
    const headers = "Data,Curtidas,Comentários,Compartilhamentos,Salvos,Investido,Resultados,CPR\n";
    const rows = metrics.map((m) =>
      `${m.date || ""},${m.likes || 0},${m.comments_count || 0},${m.shares || 0},${m.saves || 0},${m.spend || 0},${m.results || 0},${m.cost_per_result || ""}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricas-${activationId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-caption">Carregando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Métricas</SectionLabel>
        {metrics.length > 0 && (
          <Button variant="ghost" size="sm" className="gap-2" onClick={exportCSV}>
            <Download size={14} /> CSV
          </Button>
        )}
      </div>

      {metrics.length === 0 ? (
        <div className="empty-state card-base">
          <TrendingUp size={32} className="text-txt-ghost" />
          <p className="empty-state__title">Nenhuma métrica coletada</p>
          <p className="empty-state__desc">Métricas aparecerão aqui quando houver dados de performance.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Curtidas", value: totals.likes.toLocaleString("pt-BR") },
              { label: "Comentários", value: totals.comments.toLocaleString("pt-BR") },
              { label: "Compartilhamentos", value: totals.shares.toLocaleString("pt-BR") },
              { label: "Salvos", value: totals.saves.toLocaleString("pt-BR") },
              { label: "Investido", value: `R$ ${totals.spend.toLocaleString("pt-BR")}` },
              { label: "Resultados", value: totals.results.toLocaleString("pt-BR") },
            ].map((m) => (
              <div key={m.label} className="card-base">
                <p className="text-mono-label mb-1">{m.label}</p>
                <p className="text-display-lg !text-xl">{m.value}</p>
              </div>
            ))}
          </div>

          <PerformanceChart activationId={activationId} />
        </>
      )}
    </div>
  );
};
