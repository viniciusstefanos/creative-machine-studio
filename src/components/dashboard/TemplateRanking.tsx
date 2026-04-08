import { supabase } from "@/integrations/supabase/client";
import { useQueryWithToast } from "@/hooks/useQueryWithToast";
import { CardSkeleton } from "@/components/ui/CardSkeleton";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Layout } from "lucide-react";

interface RankedTemplate {
  name: string;
  count: number;
}

export const TemplateRanking = () => {
  const { data: ranking, isLoading } = useQueryWithToast<RankedTemplate[]>({
    queryKey: ["dashboard-template-ranking"],
    queryFn: async () => {
      const { data: assets } = await supabase
        .from("assets")
        .select("template_id, asset_templates(name)");
      if (!assets) return [];

      const counts: Record<string, { name: string; count: number }> = {};
      assets.forEach((a: any) => {
        const tid = a.template_id;
        if (!tid) return;
        if (!counts[tid]) counts[tid] = { name: a.asset_templates?.name || "—", count: 0 };
        counts[tid].count++;
      });

      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
    staleTime: 60_000,
    errorMessage: "Erro ao carregar ranking de templates",
  });

  if (isLoading) return (
    <div>
      <SectionLabel>Templates Mais Usados</SectionLabel>
      <div className="mt-3"><CardSkeleton count={3} /></div>
    </div>
  );

  if (!ranking || ranking.length === 0) return null;

  return (
    <div>
      <SectionLabel>Templates Mais Usados</SectionLabel>
      <div className="space-y-2 mt-3">
        {ranking.map((t, i) => (
          <div key={i} className="card-base flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0">
              <Layout size={12} className="text-txt-muted" />
            </div>
            <span className="text-body flex-1 truncate">{t.name}</span>
            <span className="text-mono font-medium">{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
