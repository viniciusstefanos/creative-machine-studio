import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

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

  if (loading) return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div>
      <SectionLabel>Métricas</SectionLabel>

      {metrics.length === 0 ? (
        <div className="p-8 rounded-lg text-center mt-4" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
          <TrendingUp size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>Nenhuma métrica coletada</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {[
              { label: "Curtidas", value: totals.likes },
              { label: "Comentários", value: totals.comments },
              { label: "Compartilhamentos", value: totals.shares },
              { label: "Salvos", value: totals.saves },
              { label: "Investido", value: `R$ ${totals.spend.toLocaleString("pt-BR")}` },
              { label: "Resultados", value: totals.results },
            ].map((m) => (
              <div
                key={m.label}
                className="p-4 rounded-lg"
                style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}
              >
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                  {m.label}
                </p>
                <p className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
