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

  if (loading) return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div>
      <SectionLabel>Agendamentos</SectionLabel>
      {posts.length === 0 ? (
        <div className="p-8 rounded-lg text-center mt-4" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
          <Calendar size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>Nenhum post agendado</p>
          {assetsApproved === 0 ? (
            <Link
              to={`/activations/${activationId}/assets`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md transition-all"
              style={{ background: "var(--accent)", color: "var(--text-inverse)", borderRadius: 6 }}
            >
              ← Aprovar peças primeiro
            </Link>
          ) : (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>
              Aprove peças visuais para agendar publicação
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}
            >
              <div>
                <p className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
                  {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("pt-BR") : "—"}
                </p>
                <p className="text-[10px] mt-1 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
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
