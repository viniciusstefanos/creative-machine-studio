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
import { Check, X, RefreshCw, Calendar, Loader2 } from "lucide-react";

const AssetDetail = () => {
  const { id, assetId } = useParams<{ id: string; assetId: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [format, setFormat] = useState<any>(null);
  const [copy, setCopy] = useState<any>(null);
  const [activation, setActivation] = useState<any>(null);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAsset = useCallback(async () => {
    if (!assetId) return;
    const { data } = await supabase.from("assets").select("*").eq("id", assetId).single();
    if (data) {
      setAsset(data);
      // Fetch related data
    const actRes = await supabase.from("activations").select("*, clients(name)").eq("id", data.activation_id).single();
      if (actRes.data) {
        setActivation(actRes.data);
        setClientName((actRes.data as any).clients?.name || "");
      }
      if (data.format_id) {
        const fmtRes = await supabase.from("asset_formats").select("*").eq("id", data.format_id).single();
        if (fmtRes.data) setFormat(fmtRes.data);
      }
      if (data.copy_id) {
        const cpRes = await supabase.from("copies").select("hook, channel, type").eq("id", data.copy_id).single();
        if (cpRes.data) setCopy(cpRes.data);
      }
        setActivation(results[0].data);
        setClientName((results[0].data as any).clients?.name || "");
      }
      if (data.format_id && results[1]?.data) setFormat(results[1].data);
      if (data.copy_id && results[data.format_id ? 2 : 1]?.data) setCopy(results[data.format_id ? 2 : 1].data);
    }
    setLoading(false);
  }, [assetId]);

  useEffect(() => { fetchAsset(); }, [fetchAsset]);

  // Poll while generating
  useEffect(() => {
    if (asset?.status !== "generating") return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("assets").select("status, html_content, image_url").eq("id", assetId!).single();
      if (data && data.status !== "generating") {
        setAsset((prev: any) => ({ ...prev, ...data }));
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
      toast({ title: status === "approved" ? "Peça aprovada!" : "Status atualizado" });
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
        format_id: asset.format_id,
        category: asset.category,
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
      .invoke("generate-asset", {
        body: { asset_id: newAsset.id, activation_id: id, copy_id: asset.copy_id, format_id: asset.format_id },
      })
      .catch(console.error);

    navigate(`/activations/${id}/assets/${newAsset.id}`);
    setActionLoading(false);
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <div className="text-sm text-txt-muted">Carregando...</div>
      </AppLayout>
    );
  }

  if (!asset) {
    return (
      <AppLayout breadcrumbs={[{ label: "Peça não encontrada" }]}>
        <div className="text-sm text-txt-muted">Peça não encontrada</div>
      </AppLayout>
    );
  }

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
          {asset.status === "generating" ? (
            <div className="rounded-lg p-12 text-center bg-surface-1 border border-line-subtle" style={{ borderRadius: 8 }}>
              <Skeleton className="w-full h-64 mb-4" />
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-accent" />
                <span className="text-sm text-txt-muted" style={{ fontFamily: "'DM Sans'" }}>Gerando peça com IA...</span>
              </div>
            </div>
          ) : asset.html_content ? (
            <div className="rounded-lg overflow-hidden border border-line-subtle" style={{ borderRadius: 8 }}>
              <iframe
                srcDoc={asset.html_content}
                sandbox="allow-scripts"
                className="w-full border-0"
                style={{ minHeight: 500, background: "#fff" }}
                title="Asset preview"
              />
            </div>
          ) : asset.image_url ? (
            <div className="rounded-lg overflow-hidden border border-line-subtle" style={{ borderRadius: 8 }}>
              <img src={asset.image_url} alt="Asset" className="w-full object-contain" />
            </div>
          ) : (
            <div className="rounded-lg p-12 text-center bg-surface-1 border border-line-subtle" style={{ borderRadius: 8 }}>
              <p className="text-sm text-txt-muted">Nenhum conteúdo disponível</p>
            </div>
          )}

          {/* Image below HTML */}
          {asset.html_content && asset.image_url && (
            <div className="mt-4 rounded-lg overflow-hidden border border-line-subtle" style={{ borderRadius: 8 }}>
              <span className="block text-[10px] uppercase tracking-wider px-4 pt-3 text-txt-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Imagem gerada
              </span>
              <img src={asset.image_url} alt="Generated" className="w-full object-contain p-4" />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Meta */}
          <div className="p-4 rounded-lg bg-surface-1 border border-line-subtle space-y-4" style={{ borderRadius: 8 }}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-txt-muted" style={{ fontFamily: "'DM Sans'" }}>Status</span>
              <StatusBadge status={asset.status} />
            </div>
            {format && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-txt-ghost" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Formato</span>
                <p className="text-sm text-txt-primary" style={{ fontFamily: "'DM Sans'" }}>{format.name}</p>
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-txt-ghost" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Versão</span>
              <p className="text-sm text-txt-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>v{asset.version || 1}</p>
            </div>
            {copy && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-txt-ghost" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Copy vinculado</span>
                <p className="text-xs text-txt-secondary line-clamp-2" style={{ fontFamily: "'DM Sans'" }}>{copy.hook}</p>
              </div>
            )}
            {asset.category && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-txt-ghost" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Categoria</span>
                <p className="text-sm text-txt-primary" style={{ fontFamily: "'DM Sans'" }}>{asset.category}</p>
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-txt-ghost" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Criado em</span>
              <p className="text-xs text-txt-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {asset.created_at ? new Date(asset.created_at).toLocaleString("pt-BR") : "—"}
              </p>
            </div>
          </div>

          {/* Actions */}
          {asset.status === "review" && (
            <div className="p-4 rounded-lg bg-surface-1 border border-line-subtle space-y-3" style={{ borderRadius: 8 }}>
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
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => updateStatus("rejected", { feedback })}
                    disabled={actionLoading}
                  >
                    Confirmar rejeição
                  </Button>
                </div>
              )}
            </div>
          )}

          {asset.status === "approved" && (
            <div className="p-4 rounded-lg bg-surface-1 border border-line-subtle" style={{ borderRadius: 8 }}>
              <Button className="w-full gap-2" onClick={() => navigate(`/activations/${id}/schedule`)}>
                <Calendar size={16} /> Agendar publicação
              </Button>
            </div>
          )}

          {asset.status === "rejected" && (
            <div className="p-4 rounded-lg bg-surface-1 border border-line-subtle space-y-3" style={{ borderRadius: 8 }}>
              {asset.feedback && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-txt-ghost" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Feedback</span>
                  <p className="text-xs text-txt-secondary mt-1" style={{ fontFamily: "'DM Sans'" }}>{asset.feedback}</p>
                </div>
              )}
              <Textarea
                placeholder="Feedback adicional (opcional)..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="text-sm"
              />
              <Button className="w-full gap-2" onClick={handleRegenerate} disabled={actionLoading}>
                <RefreshCw size={16} /> Gerar nova versão
              </Button>
            </div>
          )}

          {/* Comments */}
          <div className="p-4 rounded-lg bg-surface-1 border border-line-subtle" style={{ borderRadius: 8 }}>
            <CommentThread entityType="asset" entityId={assetId!} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AssetDetail;
