import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { SchedulePostDialog } from "./SchedulePostDialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Calendar, Send, Loader2, Plus, Trash2, Pencil, Image } from "lucide-react";
import { renderHtmlToPng, uploadPng } from "@/lib/renderPng";

interface ScheduleTabProps {
  activationId: string;
  assetsApproved?: number;
}

export const ScheduleTab = ({ activationId, assetsApproved }: ScheduleTabProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [metaAccount, setMetaAccount] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchAll = async () => {
    const { data } = await supabase
      .from("scheduled_posts")
      .select("*, assets(image_url, copy_id, activation_id, category)")
      .eq("activation_id", activationId)
      .order("scheduled_at", { ascending: true });
    setPosts(data || []);

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

  useEffect(() => { fetchAll(); }, [activationId]);

  const handlePublish = async (post: any) => {
    if (!metaAccount?.instagram_page_id) {
      toast({ title: "Configure o perfil Instagram do cliente primeiro", variant: "destructive" });
      return;
    }
    setPublishing(post.id);
    try {
      let caption = post.caption || "";
      if (!caption && post.assets?.copy_id) {
        const { data: copy } = await supabase.from("copies").select("full_copy, hook, body, cta").eq("id", post.assets.copy_id).single();
        if (copy) caption = copy.full_copy || [copy.hook, copy.body, copy.cta].filter(Boolean).join("\n\n");
      }

      // Render HTML art to PNG before publishing
      let publishImageUrl = post.assets?.image_url;
      let carouselImageUrls: string[] = [];
      let isCarousel = false;

      if (post.asset_id) {
        const { data: renders } = await supabase
          .from("asset_template_renders")
          .select("id, html_content, png_url, slide_index, image_url")
          .eq("asset_id", post.asset_id)
          .order("slide_index", { ascending: true });

        if (renders && renders.length > 1) {
          // Carousel: render all slides
          isCarousel = true;
          const { data: assetData } = await supabase
            .from("assets")
            .select("template_id")
            .eq("id", post.asset_id)
            .single();
          let w = 1080, h = 1350;
          if (assetData?.template_id) {
            const { data: tpl } = await supabase
              .from("asset_templates")
              .select("width_px, height_px")
              .eq("id", assetData.template_id)
              .single();
            if (tpl) { w = tpl.width_px; h = tpl.height_px; }
          }

          toast({ title: `Renderizando ${renders.length} slides...` });
          for (const render of renders) {
            let slideUrl = render.png_url;
            if (!slideUrl && render.html_content) {
              const dataUrl = await renderHtmlToPng(render.html_content, w, h);
              const uploaded = await uploadPng(post.asset_id, render.slide_index || 0, dataUrl);
              if (uploaded) {
                slideUrl = uploaded;
                await supabase.from("asset_template_renders")
                  .update({ png_url: uploaded })
                  .eq("id", render.id);
              }
            }
            if (slideUrl) carouselImageUrls.push(slideUrl);
          }
        } else if (renders && renders.length === 1) {
          // Single slide
          const render = renders[0];
          if (render.png_url) {
            publishImageUrl = render.png_url;
          } else if (render.html_content) {
            const { data: assetData } = await supabase
              .from("assets")
              .select("template_id")
              .eq("id", post.asset_id)
              .single();
            let w = 1080, h = 1350;
            if (assetData?.template_id) {
              const { data: tpl } = await supabase
                .from("asset_templates")
                .select("width_px, height_px")
                .eq("id", assetData.template_id)
                .single();
              if (tpl) { w = tpl.width_px; h = tpl.height_px; }
            }
            toast({ title: "Renderizando arte..." });
            const dataUrl = await renderHtmlToPng(render.html_content, w, h);
            const uploaded = await uploadPng(post.asset_id, render.slide_index || 0, dataUrl);
            if (uploaded) {
              publishImageUrl = uploaded;
              await supabase.from("asset_template_renders")
                .update({ png_url: uploaded })
                .eq("id", render.id);
            }
          }
        }
      }

      // Choose publish action based on slide count
      const body = isCarousel && carouselImageUrls.length >= 2
        ? {
            action: "publish_carousel",
            scheduled_post_id: post.id,
            instagram_page_id: metaAccount.instagram_page_id,
            page_access_token: metaAccount.page_access_token || undefined,
            images: carouselImageUrls,
            caption,
          }
        : {
            action: "publish_post",
            scheduled_post_id: post.id,
            instagram_page_id: metaAccount.instagram_page_id,
            page_access_token: metaAccount.page_access_token || undefined,
            image_url: isCarousel ? carouselImageUrls[0] : publishImageUrl,
            caption,
          };

      const { data, error } = await supabase.functions.invoke("meta-publish", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: "published", published_at: new Date().toISOString() } : p))
      );
      toast({ title: "Publicado no Instagram!" });
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e.message, variant: "destructive" });
    }
    setPublishing(null);
  };

  const handleCancel = async (postId: string) => {
    await supabase.from("scheduled_posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast({ title: "Agendamento cancelado" });
  };

  const filteredPosts = selectedDate
    ? posts.filter((p) => p.scheduled_at?.startsWith(selectedDate) || p.published_at?.startsWith(selectedDate))
    : posts;

  const scheduled = filteredPosts.filter((p) => p.status === "scheduled");
  const published = filteredPosts.filter((p) => p.status === "published");
  const failed = filteredPosts.filter((p) => p.status === "failed");

  if (loading) return <div className="text-caption">Carregando...</div>;

  const channelLabel = (ch: string) =>
    ({ instagram_feed: "Feed", instagram_reels: "Reels", instagram_stories: "Stories" }[ch] || ch || "—");

  const PostCard = ({ post }: { post: any }) => (
    <div className="card-base flex gap-3 items-start">
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-md overflow-hidden bg-[hsl(var(--bg-raised))] shrink-0 flex items-center justify-center">
        {post.assets?.image_url ? (
          <img src={post.assets.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Image size={18} className="text-txt-ghost" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={post.status} />
          <span className="text-mono text-[10px] text-caption">{channelLabel(post.channel)}</span>
        </div>
        <p className="text-mono text-xs">
          {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          }) : "—"}
        </p>
        {post.caption && (
          <p className="text-caption text-[11px] line-clamp-2 mt-1">{post.caption}</p>
        )}
        {post.assets?.category && (
          <p className="text-mono text-[10px] text-txt-ghost mt-0.5">{post.assets.category}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 shrink-0">
        {post.status === "scheduled" && (
          <>
            {metaAccount?.instagram_page_id && (
              <Button
                size="sm"
                onClick={() => handlePublish(post)}
                disabled={publishing === post.id}
                className="text-xs h-7 px-2.5 gap-1"
              >
                {publishing === post.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Publicar
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setEditingPost(post); setDialogOpen(true); }}
              className="text-xs h-7 px-2.5 gap-1"
            >
              <Pencil size={12} /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCancel(post.id)}
              className="text-xs h-7 px-2.5 gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 size={12} /> Cancelar
            </Button>
          </>
        )}
        {post.status === "failed" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditingPost(post); setDialogOpen(true); }}
            className="text-xs h-7 px-2.5 gap-1"
          >
            <Pencil size={12} /> Reagendar
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Agendamentos</SectionLabel>
        {(assetsApproved || 0) > 0 && (
          <Button
            size="sm"
            onClick={() => { setEditingPost(null); setDialogOpen(true); }}
            className="gap-1.5 text-xs h-8"
          >
            <Plus size={14} /> Agendar post
          </Button>
        )}
      </div>

      {!metaAccount?.instagram_page_id && (
        <div className="card-base flex items-center gap-2 text-xs mb-4 border-[hsl(var(--accent)_/_0.3)]">
          <Calendar size={14} className="text-accent" />
          <span className="text-caption">
            Vincule o perfil Instagram do cliente para publicar diretamente.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        {/* Calendar */}
        <div>
          <ScheduleCalendar posts={posts} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </div>

        {/* Posts list */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="empty-state card-base">
              <Calendar size={32} className="text-txt-ghost" />
              <p className="empty-state__title">
                {selectedDate ? "Nenhum post neste dia" : "Nenhum post agendado"}
              </p>
              <p className="empty-state__desc">
                {assetsApproved === 0
                  ? "Aprove peças visuais antes de agendar publicação."
                  : "Clique em 'Agendar post' para começar."}
              </p>
            </div>
          ) : (
            <>
              {scheduled.length > 0 && (
                <div className="space-y-2">
                  <span className="text-mono-label text-[10px] uppercase tracking-wider">
                    Agendados ({scheduled.length})
                  </span>
                  {scheduled.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              )}
              {failed.length > 0 && (
                <div className="space-y-2">
                  <span className="text-mono-label text-[10px] uppercase tracking-wider text-destructive">
                    Falharam ({failed.length})
                  </span>
                  {failed.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              )}
              {published.length > 0 && (
                <div className="space-y-2">
                  <span className="text-mono-label text-[10px] uppercase tracking-wider">
                    Publicados ({published.length})
                  </span>
                  {published.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <SchedulePostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activationId={activationId}
        editingPost={editingPost}
        onSaved={fetchAll}
      />
    </div>
  );
};
