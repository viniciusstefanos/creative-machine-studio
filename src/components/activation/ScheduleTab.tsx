import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";

interface ScheduleTabProps {
  activationId: string;
  assetsApproved?: number;
}

export const ScheduleTab = ({ activationId, assetsApproved }: ScheduleTabProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*")
        .eq("activation_id", activationId)
        .order("scheduled_at", { ascending: true });
      setPosts(data || []);
      setLoading(false);
    };
    fetch();
  }, [activationId]);

  if (loading) return <div className="text-caption">Carregando...</div>;

  return (
    <div>
      <SectionLabel>Agendamentos</SectionLabel>
      {posts.length === 0 ? (
        <div className="empty-state card-base mt-4">
          <Calendar size={32} className="text-txt-ghost" />
          <p className="empty-state__title">Nenhum post agendado</p>
          <p className="empty-state__desc">
            {assetsApproved === 0
              ? "Aprove peças visuais antes de agendar publicação."
              : "Suas peças estão prontas para agendar."}
          </p>
          {assetsApproved === 0 && (
            <Link
              to={`/activations/${activationId}/assets`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md transition-all"
              style={{
                background: "hsl(var(--accent))",
                color: "hsl(var(--text-inverse))",
                borderRadius: 6,
              }}
            >
              ← Aprovar peças primeiro
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {posts.map((post) => (
            <div key={post.id} className="card-base flex items-center justify-between">
              <div>
                <p className="text-mono">
                  {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("pt-BR") : "—"}
                </p>
                <p className="text-mono-label mt-1">
                  {post.channel || "—"}
                </p>
              </div>
              <StatusBadge status={post.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
