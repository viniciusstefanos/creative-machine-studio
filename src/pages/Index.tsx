import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, TrendingUp, DollarSign, FileText, Image } from "lucide-react";

interface Activation {
  id: string;
  name: string;
  type: string;
  status: string;
  clients: { name: string } | null;
}

interface ReviewItem {
  id: string;
  type: "copy" | "asset";
  activation_id: string;
  status: string;
  hook?: string;
  category?: string;
  activation_name?: string;
}

const Dashboard = () => {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [activationsRes, copiesRes, assetsRes, scheduledRes] = await Promise.all([
        supabase
          .from("activations")
          .select("id, name, type, status, clients(name)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("copies")
          .select("id, activation_id, status, hook")
          .eq("status", "review")
          .limit(10),
        supabase
          .from("assets")
          .select("id, activation_id, status, category")
          .eq("status", "review")
          .limit(10),
        supabase
          .from("scheduled_posts")
          .select("id, channel, scheduled_at, status, assets(id, category)")
          .eq("status", "scheduled")
          .order("scheduled_at", { ascending: true })
          .limit(7),
      ]);

      setActivations((activationsRes.data as any) || []);
      setScheduledPosts(scheduledRes.data || []);

      const queue: ReviewItem[] = [
        ...(copiesRes.data || []).map((c: any) => ({ ...c, type: "copy" as const })),
        ...(assetsRes.data || []).map((a: any) => ({ ...a, type: "asset" as const })),
      ];
      setReviewQueue(queue);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <h1
        className="text-2xl font-bold mb-8"
        style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
      >
        Dashboard
      </h1>

      {loading ? (
        <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>
          Carregando...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Active Activations */}
          <div className="space-y-4">
            <SectionLabel>Ativações Ativas</SectionLabel>
            {activations.length === 0 ? (
              <div
                className="p-6 rounded-lg text-center text-sm"
                style={{
                  background: "var(--bg-surface1)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-muted)",
                  fontFamily: "'DM Sans'",
                }}
              >
                Nenhuma ativação ativa
              </div>
            ) : (
              activations.map((act) => (
                <Link
                  key={act.id}
                  to={`/activations/${act.id}`}
                  className="block p-4 rounded-lg transition-all duration-150"
                  style={{
                    background: "var(--bg-surface1)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)", fontFamily: "'DM Sans'" }}
                      >
                        {act.name}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {act.clients?.name || "—"}
                      </p>
                    </div>
                    <StatusBadge status={act.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        background: "var(--bg-surface3)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {act.type}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Column 2: Approval Queue */}
          <div className="space-y-4">
            <SectionLabel>Fila de Aprovação</SectionLabel>
            {reviewQueue.length === 0 ? (
              <div
                className="p-6 rounded-lg text-center text-sm"
                style={{
                  background: "var(--bg-surface1)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-muted)",
                  fontFamily: "'DM Sans'",
                }}
              >
                Nenhum item pendente
              </div>
            ) : (
              reviewQueue.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={
                    item.type === "copy"
                      ? `/activations/${item.activation_id}/copies/${item.id}`
                      : `/activations/${item.activation_id}/assets/${item.id}`
                  }
                  className="flex items-center gap-3 p-4 rounded-lg transition-all duration-150"
                  style={{
                    background: "var(--bg-surface1)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                  }}
                >
                  <div
                    className="p-2 rounded"
                    style={{ background: "var(--bg-surface3)" }}
                  >
                    {item.type === "copy" ? (
                      <FileText size={16} style={{ color: "var(--status-review)" }} />
                    ) : (
                      <Image size={16} style={{ color: "var(--status-review)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: "var(--text-primary)", fontFamily: "'DM Sans'" }}
                    >
                      {item.type === "copy"
                        ? item.hook || "Copy sem gancho"
                        : `Peça ${item.category || ""}`}
                    </p>
                    <p
                      className="text-[10px] uppercase tracking-wider mt-0.5"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "var(--text-muted)",
                      }}
                    >
                      {item.type}
                    </p>
                  </div>
                  <StatusBadge status="review" />
                </Link>
              ))
            )}
          </div>

          {/* Column 3: Calendar + Metrics */}
          <div className="space-y-6">
            <div className="space-y-4">
              <SectionLabel>Agendamentos</SectionLabel>
              {scheduledPosts.length === 0 ? (
                <div
                  className="p-6 rounded-lg text-center text-sm"
                  style={{
                    background: "var(--bg-surface1)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-muted)",
                    fontFamily: "'DM Sans'",
                  }}
                >
                  Nenhum post agendado
                </div>
              ) : (
                scheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      background: "var(--bg-surface1)",
                      border: "1px solid var(--border-default)",
                      borderRadius: 8,
                    }}
                  >
                    <Calendar size={14} style={{ color: "var(--status-scheduled)" }} />
                    <div className="flex-1">
                      <p
                        className="text-[10px]"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {post.scheduled_at
                          ? new Date(post.scheduled_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </p>
                    </div>
                    <span
                      className="text-[10px] uppercase"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "var(--text-muted)",
                      }}
                    >
                      {post.channel || "—"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Quick Metrics */}
            <div className="space-y-4">
              <SectionLabel>Métricas Rápidas</SectionLabel>
              {[
                { icon: FileText, label: "Publicações", value: "—" },
                { icon: TrendingUp, label: "Engajamento médio", value: "—" },
                { icon: DollarSign, label: "Custo médio/resultado", value: "—" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    background: "var(--bg-surface1)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                  }}
                >
                  <metric.icon size={14} style={{ color: "var(--accent)" }} />
                  <span
                    className="flex-1 text-xs"
                    style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}
                  >
                    {metric.label}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
