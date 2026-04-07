import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommentThread } from "@/components/ui/CommentThread";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, RefreshCw, Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const AssetDetail = () => {
  const { id, assetId } = useParams<{ id: string; assetId: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [copy, setCopy] = useState<any>(null);
  const [activation, setActivation] = useState<any>(null);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [renders, setRenders] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const fetchAsset = useCallback(async () => {
    if (!assetId) return;
    const { data } = await supabase.from("assets").select("*").eq("id", assetId).single();
    if (data) {
      setAsset(data);
      const actRes = await supabase.from("activations").select("*, clients(name)").eq("id", data.activation_id).single();
      if (actRes.data) {
        setActivation(actRes.data);
        setClientName((actRes.data as any).clients?.name || "");
      }
      if (data.template_id) {
        const tplRes = await supabase.from("asset_templates").select("*").eq("id", data.template_id).single();
        if (tplRes.data) setTemplate(tplRes.data);
      }
      if (data.copy_id) {
        const cpRes = await supabase.from("copies").select("hook, channel, type").eq("id", data.copy_id).single();
        if (cpRes.data) setCopy(cpRes.data);
      }
      const { data: renderData } = await supabase
        .from("asset_template_renders")
        .select("*")
        .eq("asset_id", assetId)
        .order("slide_index");
      setRenders(renderData || []);
    }
    setLoading(false);
  }, [assetId]);

  useEffect(() => { fetchAsset(); }, [fetchAsset]);

  useEffect(() => {
    if (asset?.status !== "generating") return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("assets").select("status, html_content, image_url").eq("id", assetId!).single();
      if (data && data.status !== "generating") {
        setAsset((prev: any) => ({ ...prev, ...data }));
        const { data: rData } = await supabase.from("asset_template_renders").select("*").eq("asset_id", assetId!).order("slide_index");
        setRenders(rData || []);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [asset?.status, assetId]);

  const updateStatus = async (status: string, extraFields?: Record<string, any>) => {
    setActionLoading(true);
    const { error } = await supabase.from("assets").update({ status, ...extraFields }).eq("id", assetId!);
    if (error) {
      toast({ title: "Erro", description: "Falha ao atualizar", variant: "destructive" });
    } else {
      setAsset((prev: any) => ({ ...prev, status, ...extraFields }));
      if (status === "approved") {
        toast({ title: "Peça aprovada! ✓", description: "Agora você pode agendar publicação." });
      } else if (status === "rejected") {
        toast({ title: "Peça rejeitada", description: "Adicione feedback e gere nova versão." });
      }
    }
    setActionLoading(false);
    setShowFeedback(false);
  };

  const handleRegenerate = async () => {
    if (!asset || !id) return;
    setActionLoading(true);
    const newVersion = (asset.version || 1) + 1;
    const { data: newAsset, error } = await supabase
      .from("assets")
      .insert({
        activation_id: id,
        copy_id: asset.copy_id,
        template_id: asset.template_id,
        category: asset.category,
        render_config: asset.render_config,
        status: "generating",
        version: newVersion,
        feedback: feedback || asset.feedback,
      })
      .select()
      .single();

    if (error || !newAsset) {
      toast({ title: "Erro", description: "Falha ao criar nova versão", variant: "destructive" });
      setActionLoading(false);
      return;
    }

    supabase.functions
      .invoke("generate-asset-from-template", {
        body: {
          asset_id: newAsset.id,
          activation_id: id,
          copy_id: asset.copy_id,
          template_id: asset.template_id,
          render_config: asset.render_config,
        },
      })
      .catch(console.error);

    navigate(`/activations/${id}/assets/${newAsset.id}`);
    setActionLoading(false);
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <p className="text-body-sm">Carregando...</p>
      </AppLayout>
    );
  }

  if (!asset) {
    return (
      <AppLayout breadcrumbs={[{ label: "Peça não encontrada" }]}>
        <p className="text-body-sm">Peça não encontrada</p>
      </AppLayout>
    );
  }

  const hasMultipleSlides = renders.length > 1;
  const currentRender = renders[currentSlide];
  const aspectRatio = template?.aspect_ratio === "9:16" ? "9/16" : template?.aspect_ratio === "4:5" ? "4/5" : "1/1";

  const renderPreviewContent = () => {
    if (asset.status === "generating") {
      return (
        <div className="card-base p-12 text-center">
          <Skeleton className="w-full h-64 mb-4" />
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-accent" />
            <span className="text-body-sm">Gerando peça com IA...</span>
          </div>
        </div>
      );
    }

    if (renders.length > 0 && currentRender) {
      return (
        <div>
          {/* Main viewer */}
          <div
            className="rounded-lg overflow-hidden mx-auto border border-line bg-surface-2"
            style={{ maxWidth: 540, aspectRatio }}
          >
            {currentRender.png_url ? (
              <img src={currentRender.png_url} alt={`Slide ${currentRender.slide_index + 1}`} className="w-full h-full object-contain" />
            ) : currentRender.html_content ? (
              <div className="w-full h-full relative overflow-hidden">
                <iframe
                  srcDoc={currentRender.html_content}
                  sandbox="allow-scripts"
                  className="border-0 origin-top-left"
                  style={{
                    width: template?.width_px || 1080,
                    height: template?.height_px || 1080,
                    transform: `scale(${540 / (template?.width_px || 1080)})`,
                  }}
                  title={`Slide ${currentRender.slide_index + 1}`}
                />
              </div>
            ) : currentRender.image_url ? (
              <img src={currentRender.image_url} alt={`Slide ${currentRender.slide_index + 1}`} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-body-sm">Sem conteúdo</p>
              </div>
            )}
          </div>

          {/* Slide navigation */}
          {hasMultipleSlides && (
            <div className="mt-4">
              <div className="flex items-center justify-center gap-4 mb-3">
                <button
                  onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
                  disabled={currentSlide === 0}
                  className={`p-1.5 rounded-md bg-surface-2 transition-colors ${currentSlide === 0 ? "text-txt-ghost" : "text-txt-primary"}`}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-mono">{currentSlide + 1} / {renders.length}</span>
                <button
                  onClick={() => setCurrentSlide((s) => Math.min(renders.length - 1, s + 1))}
                  disabled={currentSlide === renders.length - 1}
                  className={`p-1.5 rounded-md bg-surface-2 transition-colors ${currentSlide === renders.length - 1 ? "text-txt-ghost" : "text-txt-primary"}`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              {/* Thumbnail strip */}
              <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
                {renders.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setCurrentSlide(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden relative transition-all border-2 ${
                      i === currentSlide ? "border-accent shadow-[0_0_0_1px_hsl(var(--accent))]" : "border-line"
                    }`}
                  >
                    {(r.png_url || r.image_url) ? (
                      <img src={r.png_url || r.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-2">
                        <span className="text-mono text-txt-muted">{i + 1}</span>
                      </div>
                    )}
                    <span className="absolute bottom-0.5 right-1 text-mono text-white drop-shadow-md">{i + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (asset.html_content) {
      return (
        <div className="rounded-lg overflow-hidden border border-line">
          <iframe srcDoc={asset.html_content} sandbox="allow-scripts" className="w-full border-0" style={{ minHeight: 500 }} title="Asset preview" />
        </div>
      );
    }

    if (asset.image_url) {
      return (
        <div className="rounded-lg overflow-hidden border border-line">
          <img src={asset.image_url} alt="Asset" className="w-full object-contain" />
        </div>
      );
    }

    return (
      <div className="card-base p-12 text-center">
        <p className="text-body-sm">Nenhum conteúdo disponível</p>
      </div>
    );
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName, href: `/clients/${activation?.client_id}` },
        { label: activation?.name || "", href: `/activations/${id}/assets` },
        { label: `Peça v${asset.version || 1}` },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Preview */}
        <div className="lg:col-span-2">
          {renderPreviewContent()}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Status & Meta */}
          <div className="card-base space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-label">Status</span>
              <StatusBadge status={asset.status} />
            </div>
            {template && (
              <div>
                <span className="text-mono-label">Template</span>
                <p className="text-body mt-1">{template.name}</p>
                <p className="text-mono mt-0.5">
                  {template.width_px}×{template.height_px}px · {template.generation_type.replace(/_/g, " ")}
                </p>
              </div>
            )}
            <div>
              <span className="text-mono-label">Versão</span>
              <p className="text-mono-lg mt-1">v{asset.version || 1}</p>
            </div>
            {copy && (
              <div>
                <span className="text-mono-label">Copy vinculado</span>
                <p className="text-body-sm line-clamp-2 mt-1">{copy.hook}</p>
              </div>
            )}
            {renders.length > 0 && (
              <div>
                <span className="text-mono-label">Slides</span>
                <p className="text-mono-lg mt-1">{renders.length}</p>
              </div>
            )}
            <div>
              <span className="text-mono-label">Criado em</span>
              <p className="text-mono mt-1">
                {asset.created_at ? new Date(asset.created_at).toLocaleString("pt-BR") : "—"}
              </p>
            </div>
          </div>

          {/* Actions */}
          {asset.status === "review" && (
            <div className="card-base space-y-3">
              <Button className="w-full gap-2" onClick={() => updateStatus("approved")} disabled={actionLoading}>
                <Check size={16} /> Aprovar
              </Button>
              {!showFeedback ? (
                <Button variant="outline" className="w-full gap-2" onClick={() => setShowFeedback(true)} disabled={actionLoading}>
                  <X size={16} /> Rejeitar
                </Button>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Feedback para a próxima versão..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="text-sm"
                  />
                  <Button variant="destructive" className="w-full" onClick={() => updateStatus("rejected", { feedback })} disabled={actionLoading}>
                    Confirmar rejeição
                  </Button>
                </div>
              )}
            </div>
          )}

          {asset.status === "approved" && (
            <div className="card-base space-y-2">
              <Button className="w-full gap-2" onClick={() => navigate(`/activations/${id}/schedule`)}>
                <Calendar size={16} /> Agendar publicação
              </Button>
              <Button variant="ghost" className="w-full gap-2 text-xs" onClick={() => navigate(`/activations/${id}/assets/new`)}>
                Criar outra peça →
              </Button>
            </div>
          )}

          {asset.status === "rejected" && (
            <div className="card-base space-y-3">
              {asset.feedback && (
                <div>
                  <span className="text-mono-label">Feedback</span>
                  <p className="text-body-sm mt-1">{asset.feedback}</p>
                </div>
              )}
              <Textarea placeholder="Feedback adicional (opcional)..." value={feedback} onChange={(e) => setFeedback(e.target.value)} className="text-sm" />
              <Button className="w-full gap-2" onClick={handleRegenerate} disabled={actionLoading}>
                <RefreshCw size={16} /> Gerar nova versão
              </Button>
            </div>
          )}

          {/* Comments */}
          <div className="card-base">
            <CommentThread entityType="asset" entityId={assetId!} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AssetDetail;
