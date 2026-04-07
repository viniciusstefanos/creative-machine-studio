import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommentThread } from "@/components/ui/CommentThread";
import { NextStepBar } from "@/components/activation/NextStepBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check, X, RefreshCw, Calendar, Loader2, ChevronLeft, ChevronRight,
  Pencil, Image, Wand2, Save, RotateCcw, ArrowLeft, Type, Layers
} from "lucide-react";
import { HtmlVisualEditor } from "@/components/ui/HtmlVisualEditor";

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
  const [workflowData, setWorkflowData] = useState({ briefDone: false, copiesApproved: 0, assetsApproved: 0, scheduledCount: 0 });

  // Sibling assets for navigation
  const [siblingAssets, setSiblingAssets] = useState<any[]>([]);
  const currentAssetIndex = siblingAssets.findIndex((a) => a.id === assetId);
  const prevAsset = currentAssetIndex > 0 ? siblingAssets[currentAssetIndex - 1] : null;
  const nextAsset = currentAssetIndex < siblingAssets.length - 1 ? siblingAssets[currentAssetIndex + 1] : null;

  // Editing state
  const [editMode, setEditMode] = useState<"none" | "html" | "refine" | "image" | "copy">("none");
  const [editHtml, setEditHtml] = useState("");
  const [refineInstruction, setRefineInstruction] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editCopy, setEditCopy] = useState<{ hook: string; body: string; cta: string }>({ hook: "", body: "", cta: "" });
  const [syncingCopy, setSyncingCopy] = useState(false);

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
        const cpRes = await supabase.from("copies").select("id, hook, body, cta, channel, type, full_copy").eq("id", data.copy_id).single();
        if (cpRes.data) setCopy(cpRes.data);
      }
      const { data: renderData } = await supabase
        .from("asset_template_renders")
        .select("*")
        .eq("asset_id", assetId)
        .order("slide_index");
      setRenders(renderData || []);

      // Fetch workflow data
      const actId = data.activation_id;
      const [briefRes, copiesApprovedRes, assetsApprovedRes, scheduledRes] = await Promise.all([
        supabase.from("briefs").select("objectives").eq("activation_id", actId).single(),
        supabase.from("copies").select("id", { count: "exact" }).eq("activation_id", actId).eq("status", "approved"),
        supabase.from("assets").select("id", { count: "exact" }).eq("activation_id", actId).eq("status", "approved"),
        supabase.from("scheduled_posts").select("id", { count: "exact" }).eq("activation_id", actId),
      ]);
      setWorkflowData({
        briefDone: !!(briefRes.data?.objectives),
        copiesApproved: copiesApprovedRes.count || 0,
        assetsApproved: assetsApprovedRes.count || 0,
        scheduledCount: scheduledRes.count || 0,
      });
    }
    setLoading(false);
  }, [assetId]);

  useEffect(() => { fetchAsset(); }, [fetchAsset]);

  // Fetch sibling assets for prev/next navigation
  useEffect(() => {
    if (!id) return;
    const fetchSiblings = async () => {
      const { data } = await supabase
        .from("assets")
        .select("id, status, version, category, image_url")
        .eq("activation_id", id)
        .order("created_at", { ascending: false });
      // Sort: review first, then generating, then rest
      const priorityOrder: Record<string, number> = { review: 0, generating: 1, rejected: 2, draft: 3, approved: 4 };
      const sorted = (data || []).sort((a, b) => (priorityOrder[a.status] ?? 5) - (priorityOrder[b.status] ?? 5));
      setSiblingAssets(sorted);
    };
    fetchSiblings();
  }, [id]);

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
      toast.error("Falha ao atualizar");
    } else {
      setAsset((prev: any) => ({ ...prev, status, ...extraFields }));
      if (status === "approved") {
        toast.success("Peça aprovada!", {
          description: "Agora você pode agendar publicação.",
          action: { label: "Agendar →", onClick: () => navigate(`/activations/${id}/schedule`) },
        });
      } else if (status === "rejected") {
        toast("Peça rejeitada", { description: "Adicione feedback e gere nova versão." });
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
      toast.error("Falha ao criar nova versão");
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

  // ─── Edit actions ─────────────────────────────────────────────
  const currentRender = renders[currentSlide];

  const startHtmlEdit = () => {
    if (!currentRender?.html_content) return;
    setEditHtml(currentRender.html_content);
    setEditMode("html");
  };

  const saveHtmlEdit = async () => {
    if (!currentRender) return;
    setEditLoading(true);
    const { error } = await supabase.functions.invoke("edit-asset-render", {
      body: { render_id: currentRender.id, asset_id: assetId, action: "save_html", html_content: editHtml },
    });
    if (error) {
      toast.error("Falha ao salvar");
    } else {
      setRenders(prev => prev.map((r, i) => i === currentSlide ? { ...r, html_content: editHtml, png_url: null } : r));
      toast.success("Salvo ✓");
      setEditMode("none");
    }
    setEditLoading(false);
  };

  const refineHtml = async () => {
    if (!currentRender || !refineInstruction.trim()) return;
    setEditLoading(true);
    const { data, error } = await supabase.functions.invoke("edit-asset-render", {
      body: {
        render_id: currentRender.id, asset_id: assetId,
        action: "refine_html", html_content: refineInstruction,
        use_claude: asset?.render_config?.use_claude,
      },
    });
    if (error || !data?.html_content) {
      toast.error("Falha ao refinar");
    } else {
      setRenders(prev => prev.map((r, i) => i === currentSlide ? { ...r, html_content: data.html_content, png_url: null } : r));
      toast.success("Design refinado ✓");
      setRefineInstruction("");
      setEditMode("none");
    }
    setEditLoading(false);
  };

  const regenerateImage = async () => {
    if (!currentRender || !imagePrompt.trim()) return;
    setEditLoading(true);
    const { data, error } = await supabase.functions.invoke("edit-asset-render", {
      body: { render_id: currentRender.id, asset_id: assetId, action: "regenerate_image", image_prompt: imagePrompt },
    });
    if (error || !data?.image_url) {
      toast.error("Falha ao gerar imagem");
    } else {
      setRenders(prev => prev.map((r, i) => i === currentSlide ? { ...r, image_url: data.image_url, png_url: null } : r));
      toast.success("Imagem regenerada ✓");
      setImagePrompt("");
      setEditMode("none");
    }
    setEditLoading(false);
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
  const aspectRatio = template?.aspect_ratio === "9:16" ? "9/16" : template?.aspect_ratio === "4:5" ? "4/5" : "1/1";
  const canEdit = asset.status === "review" || asset.status === "rejected";
  const hasHtml = !!currentRender?.html_content;
  const hasImage = !!currentRender?.image_url;

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
                  onClick={() => { setCurrentSlide((s) => Math.max(0, s - 1)); setEditMode("none"); }}
                  disabled={currentSlide === 0}
                  className={`p-1.5 rounded-md bg-surface-2 transition-colors ${currentSlide === 0 ? "text-txt-ghost" : "text-txt-primary"}`}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-mono">{currentSlide + 1} / {renders.length}</span>
                <button
                  onClick={() => { setCurrentSlide((s) => Math.min(renders.length - 1, s + 1)); setEditMode("none"); }}
                  disabled={currentSlide === renders.length - 1}
                  className={`p-1.5 rounded-md bg-surface-2 transition-colors ${currentSlide === renders.length - 1 ? "text-txt-ghost" : "text-txt-primary"}`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
                {renders.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => { setCurrentSlide(i); setEditMode("none"); }}
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

  // ─── Edit panel below preview ─────────────────────────────────
  const renderEditPanel = () => {
    if (!canEdit || !currentRender) return null;

    return (
      <div className="mt-4 space-y-3">
        {/* Edit action buttons */}
        {editMode === "none" && (
          <div className="flex flex-wrap gap-2">
            {hasHtml && (
              <>
                <Button variant="outline" size="sm" className="gap-2" onClick={startHtmlEdit}>
                  <Pencil size={14} /> Editar design
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditMode("refine")}>
                  <Wand2 size={14} /> Refinar com IA
                </Button>
              </>
            )}
            {(hasImage || template?.generation_type?.includes("image")) && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditMode("image")}>
                <Image size={14} /> Regerar imagem
              </Button>
            )}
            {copy && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                setEditCopy({ hook: copy.hook || "", body: copy.body || "", cta: copy.cta || "" });
                setEditMode("copy");
              }}>
                <Type size={14} /> Editar textos
              </Button>
            )}
          </div>
        )}

        {/* HTML visual edit */}
        {editMode === "html" && (
          <HtmlVisualEditor
            html={editHtml}
            onChange={setEditHtml}
            onSave={saveHtmlEdit}
            onClose={() => setEditMode("none")}
            onRestore={() => setEditHtml(currentRender.html_content)}
            loading={editLoading}
          />
        )}

        {/* AI refine */}
        {editMode === "refine" && (
          <div className="card-base space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-label">Refinar design com IA</span>
              <Button variant="ghost" size="sm" onClick={() => setEditMode("none")}>
                <X size={14} />
              </Button>
            </div>
            <p className="text-body-sm text-txt-muted">
              Descreva o que quer mudar. Ex: "mude a cor de fundo para azul escuro", "aumente o tamanho do texto", "troque o CTA para 'Saiba mais'"
            </p>
            <Textarea
              value={refineInstruction}
              onChange={(e) => setRefineInstruction(e.target.value)}
              className="text-sm min-h-[80px]"
              placeholder="Ex: mude a cor de fundo para #1a1a2e e aumente a fonte do título..."
            />
            <Button size="sm" className="gap-2" onClick={refineHtml} disabled={editLoading || !refineInstruction.trim()}>
              {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Aplicar refinamento
            </Button>
          </div>
        )}

        {/* Image regeneration */}
        {editMode === "image" && (
          <div className="card-base space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-label">Regerar imagem</span>
              <Button variant="ghost" size="sm" onClick={() => setEditMode("none")}>
                <X size={14} />
              </Button>
            </div>
            <p className="text-body-sm text-txt-muted">
              Descreva a imagem que deseja. Será gerada com IA.
            </p>
            <Textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="text-sm min-h-[80px]"
              placeholder="Ex: pessoa brasileira sorrindo em escritório moderno, luz natural, estilo UGC..."
            />
            <Button size="sm" className="gap-2" onClick={regenerateImage} disabled={editLoading || !imagePrompt.trim()}>
              {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
              Gerar nova imagem
            </Button>
          </div>
        )}

        {/* Copy / text edit — carousel-aware */}
        {editMode === "copy" && copy && (
          <div className="card-base space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={14} className="text-accent" />
                <span className="text-label">Editar textos</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditMode("none")}>
                <X size={14} />
              </Button>
            </div>

            {hasMultipleSlides && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-md text-xs"
                style={{ background: "hsl(var(--surface-3))", color: "hsl(var(--text-secondary))" }}
              >
                <Layers size={12} />
                <span>Carrossel com {renders.length} slides. Edite os textos aqui e aplique em todos os slides.</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-mono-label mb-1.5 block text-xs" style={{ color: "hsl(var(--text-muted))" }}>
                  Hook / Título
                </label>
                <Textarea
                  value={editCopy.hook}
                  onChange={(e) => setEditCopy(prev => ({ ...prev, hook: e.target.value }))}
                  className="text-sm min-h-[50px] font-medium"
                  placeholder="Gancho principal que prende a atenção..."
                />
              </div>
              <div>
                <label className="text-mono-label mb-1.5 block text-xs" style={{ color: "hsl(var(--text-muted))" }}>
                  Corpo
                </label>
                <Textarea
                  value={editCopy.body}
                  onChange={(e) => setEditCopy(prev => ({ ...prev, body: e.target.value }))}
                  className="text-sm min-h-[70px]"
                  placeholder="Desenvolvimento do conteúdo..."
                />
              </div>
              <div>
                <label className="text-mono-label mb-1.5 block text-xs" style={{ color: "hsl(var(--text-muted))" }}>
                  CTA
                </label>
                <Textarea
                  value={editCopy.cta}
                  onChange={(e) => setEditCopy(prev => ({ ...prev, cta: e.target.value }))}
                  className="text-sm min-h-[36px]"
                  rows={1}
                  placeholder="Ex: Saiba mais, Compre agora..."
                />
              </div>
            </div>

            <div
              className="flex flex-wrap gap-2 pt-2"
              style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}
            >
              <Button size="sm" className="gap-2" onClick={async () => {
                if (!copy?.id) return;
                setEditLoading(true);
                const fullCopy = [editCopy.hook, editCopy.body, editCopy.cta].filter(Boolean).join("\n\n");
                const { error } = await supabase.from("copies").update({
                  hook: editCopy.hook,
                  body: editCopy.body,
                  cta: editCopy.cta,
                  full_copy: fullCopy,
                }).eq("id", copy.id);
                if (error) {
                  toast.error("Falha ao salvar copy");
                } else {
                  setCopy((prev: any) => ({ ...prev, hook: editCopy.hook, body: editCopy.body, cta: editCopy.cta, full_copy: fullCopy }));
                  toast.success("Copy salvo ✓");
                  setEditMode("none");
                }
                setEditLoading(false);
              }} disabled={editLoading}>
                {editLoading && !syncingCopy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar copy
              </Button>

              {hasHtml && (
                <Button size="sm" variant="outline" className="gap-2" onClick={async () => {
                  if (!copy?.id) return;
                  setSyncingCopy(true);
                  setEditLoading(true);
                  // Save copy first
                  const fullCopy = [editCopy.hook, editCopy.body, editCopy.cta].filter(Boolean).join("\n\n");
                  await supabase.from("copies").update({
                    hook: editCopy.hook, body: editCopy.body, cta: editCopy.cta, full_copy: fullCopy,
                  }).eq("id", copy.id);
                  setCopy((prev: any) => ({ ...prev, hook: editCopy.hook, body: editCopy.body, cta: editCopy.cta, full_copy: fullCopy }));

                  // Apply to all renders via AI refine
                  const instruction = `Atualize os textos da peça para refletir a nova copy: Hook="${editCopy.hook}", Corpo="${editCopy.body}", CTA="${editCopy.cta}". Mantenha o layout, cores e design exatamente como estão. Apenas troque os textos.`;
                  let hadError = false;
                  for (const render of renders) {
                    if (!render.html_content) continue;
                    const { data, error } = await supabase.functions.invoke("edit-asset-render", {
                      body: {
                        render_id: render.id,
                        asset_id: assetId,
                        action: "refine_html",
                        html_content: instruction,
                        use_claude: asset?.render_config?.use_claude,
                      },
                    });
                    if (!error && data?.html_content) {
                      setRenders(prev => prev.map(r => r.id === render.id ? { ...r, html_content: data.html_content, png_url: null } : r));
                    } else {
                      hadError = true;
                    }
                  }
                  if (hadError) {
                    toast.error("Alguns slides não foram atualizados");
                  } else {
                    toast.success("Copy salvo e aplicado ao design ✓");
                  }
                  setEditMode("none");
                  setEditLoading(false);
                  setSyncingCopy(false);
                }} disabled={editLoading}>
                  {syncingCopy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  Salvar e aplicar no design
                </Button>
              )}

              <Button variant="ghost" size="sm" className="gap-2 ml-auto" onClick={() => {
                setEditCopy({ hook: copy.hook || "", body: copy.body || "", cta: copy.cta || "" });
              }}>
                <RotateCcw size={14} /> Restaurar
              </Button>
            </div>
          </div>
        )}
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
      {/* Back button + workflow */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/activations/${id}/assets`)}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-display-md">Peça v{asset.version || 1}</h1>
        <StatusBadge status={asset.status} />
        <div className="ml-auto flex items-center gap-1">
          {siblingAssets.length > 1 && (() => {
            const reviewCount = siblingAssets.filter(a => a.status === "review").length;
            return (
              <span className="text-mono text-txt-muted mr-2">
                {currentAssetIndex + 1}/{siblingAssets.length}
                {reviewCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px]" style={{ background: "hsl(var(--status-review) / 0.15)", color: "hsl(var(--status-review))" }}>
                    {reviewCount} p/ revisar
                  </span>
                )}
              </span>
            );
          })()}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!prevAsset}
            onClick={() => prevAsset && navigate(`/activations/${id}/assets/${prevAsset.id}`)}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!nextAsset}
            onClick={() => nextAsset && navigate(`/activations/${id}/assets/${nextAsset.id}`)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <NextStepBar
        activationId={id!}
        currentStep="assets"
        briefDone={workflowData.briefDone}
        copiesApproved={workflowData.copiesApproved}
        assetsApproved={workflowData.assetsApproved}
        scheduledCount={workflowData.scheduledCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Preview + Edit */}
        <div className="lg:col-span-2">
          {renderPreviewContent()}
          {renderEditPanel()}
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
              {nextAsset ? (
                <Button className="w-full gap-2" onClick={async () => {
                  await updateStatus("approved");
                  navigate(`/activations/${id}/assets/${nextAsset.id}`);
                }} disabled={actionLoading}>
                  <Check size={16} /> Aprovar e próxima →
                </Button>
              ) : (
                <Button className="w-full gap-2" onClick={() => updateStatus("approved")} disabled={actionLoading}>
                  <Check size={16} /> Aprovar
                </Button>
              )}
              <Button variant="outline" className="w-full gap-2" onClick={() => {
                updateStatus("approved");
                navigate(`/activations/${id}/schedule`);
              }} disabled={actionLoading}>
                <Calendar size={16} /> Aprovar e agendar
              </Button>
              {!showFeedback ? (
                <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/30" onClick={() => setShowFeedback(true)} disabled={actionLoading}>
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
                  <div className="flex gap-2">
                    <Button variant="destructive" className="flex-1" onClick={() => updateStatus("rejected", { feedback })} disabled={actionLoading}>
                      Rejeitar
                    </Button>
                    {nextAsset && (
                      <Button variant="destructive" className="flex-1 gap-1" onClick={async () => {
                        await updateStatus("rejected", { feedback });
                        navigate(`/activations/${id}/assets/${nextAsset.id}`);
                      }} disabled={actionLoading}>
                        Rejeitar e próxima →
                      </Button>
                    )}
                  </div>
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
              <Button variant="outline" className="w-full gap-2 text-xs text-destructive border-destructive/30" onClick={() => updateStatus("review")} disabled={actionLoading}>
                <RotateCcw size={14} /> Desaprovar (voltar p/ revisão)
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
