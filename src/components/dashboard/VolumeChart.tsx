import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface WeekData {
  week: string;
  generated: number;
  approved: number;
  rejected: number;
}

export const VolumeChart = () => {
  const [data, setData] = useState<WeekData[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      const { data: assets } = await supabase
        .from("assets")
        .select("created_at, status")
        .gte("created_at", eightWeeksAgo.toISOString());

      if (!assets || assets.length === 0) { setData([]); return; }

      const weeks: Record<string, WeekData> = {};
      assets.forEach((a) => {
        const d = new Date(a.created_at!);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split("T")[0];
        if (!weeks[key]) weeks[key] = { week: key, generated: 0, approved: 0, rejected: 0 };
        weeks[key].generated++;
        if (a.status === "approved") weeks[key].approved++;
        if (a.status === "rejected") weeks[key].rejected++;
      });

      setData(Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week)));
    };
    fetch();
  }, []);

  const formatWeek = (w: string) => {
    const d = new Date(w + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <div>
      <SectionLabel>Volume Semanal de Peças</SectionLabel>
      {data.length === 0 ? (
        <div className="card-base text-center py-8 mt-3">
          <p className="text-caption">Nenhuma peça gerada nas últimas 8 semanas</p>
        </div>
      ) : (
        <div className="card-base mt-3" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
              <XAxis dataKey="week" tickFormatter={formatWeek} tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--bg-surface2))",
                  border: "1px solid hsl(var(--border-default))",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "hsl(var(--text-primary))",
                }}
              />
              <Bar dataKey="generated" name="Geradas" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="approved" name="Aprovadas" fill="hsl(var(--status-approved))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="rejected" name="Rejeitadas" fill="hsl(var(--status-rejected))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
