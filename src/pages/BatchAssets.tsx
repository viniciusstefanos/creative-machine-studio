import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TemplatePreview } from "@/components/ui/TemplatePreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Layers, Zap } from "lucide-react";
import { buildAssetName } from "@/lib/assetNaming";

const CATEGORY_LABELS: Record<string, string> = {
  static: "Estático",
  carousel: "Carrossel",
  stories: "Story",
  reels: "Reels",
  feed: "Feed",
  video: "Vídeo",
};

const CATEGORY_COLORS: Record<string, string> = {
  static: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  carousel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  stories: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  reels: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  feed: "bg-green-500/20 text-green-400 border-green-500/30",
  video: "bg-red-500/20 text-red-400 border-red-500/30",
};

const FUNNEL_LABELS: Record<string, string> = {
  tofu: "Topo",
  mofu: "Meio",
  bofu: "Fundo",
};

/** Extract hex colors from brief + brief_files */
function extractBriefColors(brief: any, briefFiles?: any[]): Record<string, string | undefined> {
  const colors: string[] = [];
  const hexMatches = (brief?.brand_colors || "").match(/#[0-9A-Fa-f]{6}/g) || [];
  colors.push(...hexMatches);
  const consolidated = (brief?.consolidated_context as any)?.visual_guidelines?.colors_hex || [];
  colors.push(...consolidated.filter((c: string) => !colors.includes(c)));
  if (colors.length === 0 && briefFiles?.length) {
    for (const f of briefFiles) {
      const ef = f.extracted_fields;
      if (ef?.visual_guidelines?.colors_hex) {
        for (const c of (ef.visual_guidelines.colors_hex as string[])) {
          const hex = c.match(/#[0-9A-Fa-f]{6}/)?.[0];
          if (hex && !colors.includes(hex)) colors.push(hex);
        }
      }
    }
  }
  return {
    primary: colors[0], secondary: colors[1], accent: colors[1] || colors[0],
    background: colors[0], text: colors[2] || "#f5f5f0",
  };
}

/** Build render_config from template's editable_fields + brief colors */
function buildRenderConfig(template: any, brief: any): Record<string, any> {
  const fields = template?.editable_fields as Record<string, any> | null;
  if (!fields) return {};
  const briefColors = extractBriefColors(brief);
  const fromBriefMap: Record<string, string | undefined> = {
    background: briefColors.primary, accent: briefColors.accent,
    text: briefColors.text || "#f5f5f0", primary: briefColors.primary, secondary: briefColors.secondary,
  };
  const config: Record<string, any> = {};
  Object.entries(fields).forEach(([key, field]: [string, any]) => {
    config[key] = field.default;
    if (field.type === "color" && field.from_brief && fromBriefMap[field.from_brief]) {
      config[key] = fromBriefMap[field.from_brief];
    }
  });
  return config;
}

const BatchAssets = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copies, setCopies] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [activation, setActivation] = useState<any>(null);
  const [brief, setBrief] = useState<any>(null);
  const [briefFiles, setBriefFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [copiesRes, templatesRes, actRes, briefRes, briefFilesRes] = await Promise.all([
        supabase.from("copies").select("*").eq("activation_id", id).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.from("asset_templates").select("*").eq("active", true).order("name"),
        supabase.from("activations").select("*, clients(name)").eq("id", id).single(),
        supabase.from("briefs").select("*").eq("activation_id", id).maybeSingle(),
        supabase.from("brief_files").select("extracted_fields").eq("activation_id", id).not("extracted_fields", "is", null),
      ]);
      setCopies(copiesRes.data || []);
      setTemplates(templatesRes.data || []);
      setActivation(actRes.data);
      setBrief(briefRes.data);
      setBriefFiles(briefFilesRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Group templates by category and apply filter
  const categories = useMemo(() => {
    const cats = new Map<string, any[]>();
    templates.forEach((t) => {
      const cat = t.category || "static";
      if (!cats.has(cat)) cats.set(cat, []);
      cats.get(cat)!.push(t);
    });
    return cats;
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!categoryFilter) return templates;
    return templates.filter((t) => (t.category || "static") === categoryFilter);
  }, [templates, categoryFilter]);

  // Group filtered templates by category for display
  const groupedTemplates = useMemo(() => {
    const cats = new Map<string, any[]>();
    filteredTemplates.forEach((t) => {
      const cat = t.category || "static";
      if (!cats.has(cat)) cats.set(cat, []);
      cats.get(cat)!.push(t);
    });
    return cats;
  }, [filteredTemplates]);

  const toggleCell = (copyId: string, templateId: string) => {
    const key = `${copyId}::${templateId}`;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleColumn = (templateId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const keys = copies.map((c) => `${c.id}::${templateId}`);
      const allSelected = keys.every((k) => next.has(k));
      keys.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const toggleRow = (copyId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const keys = filteredTemplates.map((t) => `${copyId}::${t.id}`);
      const allSelected = keys.every((k) => next.has(k));
      keys.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set<string>();
    copies.forEach((c) => filteredTemplates.forEach((t) => all.add(`${c.id}::${t.id}`)));
    setSelected(all);
  };

  const deselectAll = () => setSelected(new Set());

  const handleGenerate = async () => {
    if (selected.size === 0 || !id) return;
    setGenerating(true);
    setProgress({ done: 0, total: selected.size });

    const items = Array.from(selected).map((key) => {
      const [copy_id, template_id] = key.split("::");
      return { copy_id, template_id };
    });

    // Calculate batch label for assets
    const { data: distinctBatches } = await supabase
      .from("assets")
      .select("batch_label")
      .eq("activation_id", id)
      .not("batch_label", "is", null);
    const uniqueLabels = new Set((distinctBatches || []).map((r: any) => r.batch_label));
    const batchLabel = `Lote #${uniqueLabels.size + 1}`;

    const { count: existingCount } = await supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("activation_id", id);
    let seq = (existingCount || 0) + 1;

    for (let i = 0; i < items.length; i++) {
      const { copy_id, template_id } = items[i];
      const copy = copies.find((c) => c.id === copy_id);
      const template = templates.find((t) => t.id === template_id);
      const assetName = buildAssetName(seq, template?.category || "static", copy?.hook);
      seq++;

      try {
        const renderConfig = buildRenderConfig(template, brief);
        const { data: asset } = await supabase
          .from("assets")
          .insert({
            activation_id: id,
            copy_id,
            template_id,
            status: "generating",
            category: template?.category || "static",
            render_config: renderConfig,
            name: assetName,
            batch_label: batchLabel,
          })
          .select()
          .single();

        if (asset) {
          supabase.functions.invoke("generate-asset-from-template", {
            body: { asset_id: asset.id, activation_id: id, copy_id, template_id, render_config: renderConfig },
          }).catch((err) => console.error("batch gen error:", err));
        }
      } catch (err) {
        console.error("batch insert error:", err);
      }
      setProgress({ done: i + 1, total: items.length });
    }

    setGenerating(false);
    toast({ title: `${batchLabel} concluído`, description: `${items.length} peças enviadas para geração.` });
    navigate(`/activations/${id}/assets`);
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <p className="text-body-sm">Carregando...</p>
      </AppLayout>
    );
  }

  const clientName = (activation as any)?.clients?.name || "";
  const uniqueCategories = Array.from(categories.keys());

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName, href: `/clients/${activation?.client_id}` },
        { label: activation?.name || "", href: `/activations/${id}/assets` },
        { label: "Gerar em Lote" },
      ]}
    >
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-display-lg">Matriz Generativa</h1>
            <p className="text-caption mt-1">Selecione combinações de copies × templates para gerar em lote</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={selectAll}>Selecionar tudo</Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>Limpar</Button>
            <Button
              size="sm"
              className="gap-2"
              disabled={selected.size === 0 || generating}
              onClick={handleGenerate}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Gerar {selected.size} peça{selected.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>

        {/* Category filter */}
        {uniqueCategories.length > 1 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-mono-label text-[10px]">Filtrar:</span>
            <button
              onClick={() => setCategoryFilter(null)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                !categoryFilter
                  ? "bg-accent/20 text-accent border-accent/40"
                  : "border-line-subtle text-txt-muted hover:border-line-default"
              }`}
            >
              Todos ({templates.length})
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  categoryFilter === cat
                    ? CATEGORY_COLORS[cat] || "bg-accent/20 text-accent border-accent/40"
                    : "border-line-subtle text-txt-muted hover:border-line-default"
                }`}
              >
                {CATEGORY_LABELS[cat] || cat} ({categories.get(cat)?.length || 0})
              </button>
            ))}
          </div>
        )}

        {generating && (
          <div className="card-base mb-6 space-y-2">
            <p className="text-mono-label">Gerando {progress.done} / {progress.total}</p>
            <Progress value={(progress.done / progress.total) * 100} className="h-2" />
          </div>
        )}

        {copies.length === 0 ? (
          <div className="empty-state card-base">
            <Layers size={32} className="text-txt-ghost" />
            <p className="empty-state__title">Nenhum copy aprovado</p>
            <p className="empty-state__desc">Aprove copies antes de gerar peças em lote.</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="empty-state card-base">
            <Layers size={32} className="text-txt-ghost" />
            <p className="empty-state__title">Nenhum template disponível</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                {/* Category group headers */}
                <tr>
                  <th className="sticky left-0 bg-base z-20" />
                  {Array.from(groupedTemplates.entries()).map(([cat, tpls]) => (
                    <th
                      key={cat}
                      colSpan={tpls.length}
                      className="text-center px-1 pt-2 pb-1"
                    >
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat] || "border-line-subtle text-txt-muted"}`}>
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                    </th>
                  ))}
                </tr>
                {/* Template headers */}
                <tr>
                  <th
                    className="text-mono-label text-left p-2 sticky left-0 bg-base z-20 border-b border-line-subtle"
                    style={{ minWidth: 200 }}
                  >
                    <span className="text-[10px]">Copies ↓ / Templates →</span>
                  </th>
                  {Array.from(groupedTemplates.entries()).map(([cat, tpls]) =>
                    tpls.map((t, idx) => {
                      const isColSelected = copies.every((c) => selected.has(`${c.id}::${t.id}`));
                      return (
                        <th
                          key={t.id}
                          className={`text-center p-1.5 border-b border-line-subtle cursor-pointer transition-colors ${
                            hoveredCol === t.id ? "bg-accent/5" : ""
                          } ${idx === 0 && cat !== Array.from(groupedTemplates.keys())[0] ? "border-l border-line-subtle" : ""}`}
                          style={{ minWidth: 140 }}
                          onClick={() => toggleColumn(t.id)}
                          onMouseEnter={() => setHoveredCol(t.id)}
                          onMouseLeave={() => setHoveredCol(null)}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-1.5">
                                {/* Mini preview */}
                                <div className="w-full max-w-[100px] mx-auto opacity-80" style={{ transform: "scale(0.6)", transformOrigin: "center", height: 72, overflow: "hidden" }}>
                                  <TemplatePreview template={t} />
                                </div>
                                {/* Name */}
                                <span className="text-[10px] text-txt-primary truncate max-w-[130px] leading-tight font-medium">
                                  {t.name}
                                </span>
                                {/* Meta row */}
                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                  <span className="text-[9px] text-txt-ghost">{t.aspect_ratio || `${t.width_px}×${t.height_px}`}</span>
                                  {t.funnel_stage && (
                                    <span className="text-[8px] px-1 py-px rounded bg-surface3 text-txt-muted">
                                      {FUNNEL_LABELS[t.funnel_stage] || t.funnel_stage}
                                    </span>
                                  )}
                                </div>
                                {/* Selection indicator */}
                                <div className={`w-3 h-3 rounded-sm border transition-colors ${
                                  isColSelected
                                    ? "bg-accent border-accent"
                                    : "border-line-subtle"
                                }`} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px]">
                              <p className="font-medium text-xs">{t.name}</p>
                              <p className="text-[10px] text-txt-muted mt-0.5">
                                {t.category} · {t.aspect_ratio} · {t.width_px}×{t.height_px}
                              </p>
                              {t.description && <p className="text-[10px] text-txt-ghost mt-1">{t.description}</p>}
                              <p className="text-[9px] text-txt-ghost mt-1">Clique para selecionar/deselecionar coluna</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {copies.map((c) => {
                  const isRowSelected = filteredTemplates.every((t) => selected.has(`${c.id}::${t.id}`));
                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-line-subtle transition-colors ${
                        hoveredRow === c.id ? "bg-accent/5" : ""
                      }`}
                      onMouseEnter={() => setHoveredRow(c.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td
                        className="p-2 sticky left-0 bg-base z-10 cursor-pointer border-r border-line-subtle"
                        onClick={() => toggleRow(c.id)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-3 h-3 rounded-sm border mt-0.5 flex-shrink-0 transition-colors ${
                            isRowSelected ? "bg-accent border-accent" : "border-line-subtle"
                          }`} />
                          <div className="min-w-0">
                            <p className="text-body-sm truncate max-w-[180px]">{c.hook || c.body || "—"}</p>
                            <p className="text-mono-label text-[10px]">{c.channel} · v{c.version}</p>
                          </div>
                        </div>
                      </td>
                      {Array.from(groupedTemplates.entries()).map(([cat, tpls]) =>
                        tpls.map((t, idx) => {
                          const key = `${c.id}::${t.id}`;
                          return (
                            <td
                              key={t.id}
                              className={`text-center p-2 transition-colors ${
                                hoveredCol === t.id || hoveredRow === c.id ? "bg-accent/5" : ""
                              } ${idx === 0 && cat !== Array.from(groupedTemplates.keys())[0] ? "border-l border-line-subtle" : ""}`}
                            >
                              <Checkbox
                                checked={selected.has(key)}
                                onCheckedChange={() => toggleCell(c.id, t.id)}
                              />
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TooltipProvider>
    </AppLayout>
  );
};

export default BatchAssets;
