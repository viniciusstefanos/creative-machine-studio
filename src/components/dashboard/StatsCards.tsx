import { supabase } from "@/integrations/supabase/client";
import { useQueryWithToast } from "@/hooks/useQueryWithToast";
import { StatSkeleton } from "@/components/ui/CardSkeleton";
import { FileText, Image, CheckCircle, XCircle, Send, Layers } from "lucide-react";

interface Stats {
  totalAssets: number;
  approved: number;
  rejected: number;
  published: number;
  totalCopies: number;
  activations: number;
}

export const StatsCards = () => {
  const { data: stats, isLoading } = useQueryWithToast<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [assetsRes, copiesRes, activationsRes, scheduledRes] = await Promise.all([
        supabase.from("assets").select("status"),
        supabase.from("copies").select("id", { count: "exact", head: true }),
        supabase.from("activations").select("id", { count: "exact", head: true }),
        supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
      ]);
      const assets = assetsRes.data || [];
      return {
        totalAssets: assets.length,
        approved: assets.filter((a) => a.status === "approved").length,
        rejected: assets.filter((a) => a.status === "rejected").length,
        published: scheduledRes.count || 0,
        totalCopies: copiesRes.count || 0,
        activations: activationsRes.count || 0,
      };
    },
    staleTime: 30_000,
    errorMessage: "Erro ao carregar estatísticas",
  });

  if (isLoading || !stats) return <StatSkeleton />;

  const cards = [
    { label: "Ativações", value: stats.activations, icon: Layers, color: "hsl(var(--accent))" },
    { label: "Copies", value: stats.totalCopies, icon: FileText, color: "hsl(var(--status-review))" },
    { label: "Peças Geradas", value: stats.totalAssets, icon: Image, color: "hsl(var(--accent))" },
    { label: "Aprovadas", value: stats.approved, icon: CheckCircle, color: "hsl(var(--status-approved))" },
    { label: "Rejeitadas", value: stats.rejected, icon: XCircle, color: "hsl(var(--status-rejected))" },
    { label: "Publicadas", value: stats.published, icon: Send, color: "hsl(var(--status-scheduled))" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="card-base flex flex-col items-start gap-2">
          <c.icon size={18} style={{ color: c.color }} />
          <span className="text-mono-label">{c.label}</span>
          <span className="text-display-lg !text-2xl">{c.value}</span>
        </div>
      ))}
    </div>
  );
};
