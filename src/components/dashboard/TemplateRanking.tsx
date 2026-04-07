import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Layout } from "lucide-react";

interface RankedTemplate {
  name: string;
  count: number;
}

export const TemplateRanking = () => {
  const [ranking, setRanking] = useState<RankedTemplate[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: assets } = await supabase
        .from("assets")
        .select("template_id, asset_templates(name)");
      if (!assets) return;

      const counts: Record<string, { name: string; count: number }> = {};
      assets.forEach((a: any) => {
        const tid = a.template_id;
        if (!tid) return;
        if (!counts[tid]) counts[tid] = { name: a.asset_templates?.name || "—", count: 0 };
        counts[tid].count++;
      });

      setRanking(
        Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );
    };
    fetch();
  }, []);

  if (ranking.length === 0) return null;

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
