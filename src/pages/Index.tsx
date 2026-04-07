import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { TemplateRanking } from "@/components/dashboard/TemplateRanking";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, FileText, Image, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        supabase.from("copies").select("id, activation_id, status, hook").eq("status", "review").limit(10),
        supabase.from("assets").select("id, activation_id, status, category").eq("status", "review").limit(10),
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

  const exportGlobalCSV = async () => {
    const { data: metrics } = await supabase
      .from("metrics")
      .select("*, activations(name), assets(category, asset_templates(name))")
      .order("date", { ascending: false })
      .limit(1000);
    if (!metrics || metrics.length === 0) return;
    const headers = "Ativação,Peça,Template,Data,Curtidas,Comentários,Compartilhamentos,Salvos,Investido,Resultados,CPR\n";
    const rows = metrics.map((m: any) =>
      `"${m.activations?.name || ""}","${m.assets?.category || ""}","${m.assets?.asset_templates?.name || ""}",${m.date || ""},${m.likes || 0},${m.comments_count || 0},${m.shares || 0},${m.saves || 0},${m.spend || 0},${m.results || 0},${m.cost_per_result || ""}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-geral-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display-lg">Dashboard</h1>
        <Button variant="ghost" size="sm" className="gap-2" onClick={exportGlobalCSV}>
          <Download size={14} /> Exportar CSV
        </Button>
      </div>

      {loading ? (
        <p className="text-caption">Carregando...</p>
      ) : (
        <div className="space-y-8">
          {/* Stats */}
          <StatsCards />

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VolumeChart />
            <TemplateRanking />
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active activations */}
            <div className="space-y-3">
              <SectionLabel>Ativações Ativas</SectionLabel>
              {activations.length === 0 ? (
                <div className="card-base text-center py-6">
                  <p className="text-caption">Nenhuma ativação ativa</p>
                </div>
              ) : (
                activations.map((act) => (
                  <Link key={act.id} to={`/activations/${act.id}`} className="card-base card-interactive block">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-body font-medium">{act.name}</p>
                        <p className="text-mono-label mt-0.5">{act.clients?.name || "—"}</p>
                      </div>
                      <StatusBadge status={act.status} />
                    </div>
                    <span className="text-mono px-1.5 py-0.5 rounded bg-surface-3 text-txt-muted">{act.type}</span>
                  </Link>
                ))
              )}
            </div>

            {/* Review queue */}
            <div className="space-y-3">
              <SectionLabel>Fila de Aprovação</SectionLabel>
              {reviewQueue.length === 0 ? (
                <div className="card-base text-center py-6">
                  <p className="text-caption">Nenhum item pendente</p>
                </div>
              ) : (
                reviewQueue.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.type === "copy" ? `/activations/${item.activation_id}/copies/${item.id}` : `/activations/${item.activation_id}/assets/${item.id}`}
                    className="card-base card-interactive flex items-center gap-3"
                  >
                    <div className="p-2 rounded bg-surface-3">
                      {item.type === "copy" ? <FileText size={16} className="text-txt-muted" /> : <Image size={16} className="text-txt-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm truncate">{item.type === "copy" ? item.hook || "Copy" : `Peça ${item.category || ""}`}</p>
                      <p className="text-mono-label">{item.type}</p>
                    </div>
                    <StatusBadge status="review" />
                  </Link>
                ))
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-3">
              <SectionLabel>Agendamentos</SectionLabel>
              {scheduledPosts.length === 0 ? (
                <div className="card-base text-center py-6">
                  <p className="text-caption">Nenhum post agendado</p>
                </div>
              ) : (
                scheduledPosts.map((post) => (
                  <div key={post.id} className="card-base flex items-center gap-3">
                    <Calendar size={14} style={{ color: "hsl(var(--status-scheduled))" }} />
                    <span className="text-mono-label flex-1">
                      {post.scheduled_at
                        ? new Date(post.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </span>
                    <span className="text-mono-label">{post.channel || "—"}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
