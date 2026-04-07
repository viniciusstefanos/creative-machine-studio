import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Calendar, Send, Loader2 } from "lucide-react";

interface ScheduleTabProps {
  activationId: string;
  assetsApproved?: number;
}

export const ScheduleTab = ({ activationId, assetsApproved }: ScheduleTabProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [metaAccount, setMetaAccount] = useState<any>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*, assets(image_url, copy_id, activation_id)")
        .eq("activation_id", activationId)
        .order("scheduled_at", { ascending: true });
      setPosts(data || []);

      // Get client's meta account via activation
      const { data: act } = await supabase
        .from("activations")
        .select("client_id")
        .eq("id", activationId)
        .single();
      if (act?.client_id) {
        const { data: meta } = await supabase
          .from("client_meta_accounts")
          .select("*")
          .eq("client_id", act.client_id)
          .maybeSingle();
        setMetaAccount(meta);
      }
      setLoading(false);
    };
    fetchAll();
  }, [activationId]);

  const handlePublish = async (post: any) => {
    if (!metaAccount?.instagram_page_id) {
      toast({ title: "Configure o perfil Instagram do cliente primeiro", variant: "destructive" });
      return;
    }
    setPublishing(post.id);
    try {
      // Get copy text for caption
      let caption = "";
      if (post.assets?.copy_id) {
        const { data: copy } = await supabase.from("copies").select("full_copy, hook, body, cta").eq("id", post.assets.copy_id).single();
        if (copy) caption = copy.full_copy || [copy.hook, copy.body, copy.cta].filter(Boolean).join("\n\n");
      }

      const { data, error } = await supabase.functions.invoke("meta-publish", {
        body: {
          action: "publish_post",
          scheduled_post_id: post.id,
          instagram_page_id: metaAccount.instagram_page_id,
          page_access_token: metaAccount.page_access_token || undefined,
          image_url: post.assets?.image_url,
          caption,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update local state
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: "published", published_at: new Date().toISOString() } : p))
      );
      toast({ title: "Publicado no Instagram!" });
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e.message, variant: "destructive" });
    }
    setPublishing(null);
  };

  if (loading) return <div className="text-caption">Carregando...</div>;

  return (
    <div>
      <SectionLabel>Agendamentos</SectionLabel>

      {!metaAccount?.instagram_page_id && (
        <div className="card-base mt-3 flex items-center gap-2 text-xs" style={{ borderColor: "hsl(var(--warning, 45 100% 50%))" }}>
          <Calendar size={14} className="text-accent" />
          <span className="text-caption">
            Vincule o perfil Instagram do cliente para publicar diretamente.
          </span>
        </div>
      )}

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
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md btn-primary"
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
              <div className="flex items-center gap-2">
                <StatusBadge status={post.status} />
                {post.status !== "published" && metaAccount?.instagram_page_id && (
                  <Button
                    size="sm"
                    onClick={() => handlePublish(post)}
                    disabled={publishing === post.id}
                    className="btn-primary text-xs h-7 px-3"
                  >
                    {publishing === post.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={12} className="mr-1" /> Publicar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
