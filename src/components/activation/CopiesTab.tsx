import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Sparkles, Loader2, Trash2, LayoutGrid, LayoutList, Search, ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface CopiesTabProps {
  activationId: string;
  briefDone?: boolean;
}

type PurposeFilter = "all" | "organic" | "ads";
type GeneratePurpose = "organic" | "ads" | "both";

const purposeLabel: Record<string, string> = {
  organic: "ORG",
  ads: "ADS",
};

const purposeColor: Record<string, string> = {
  organic: "--status-published",
  ads: "--accent",
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "review", label: "Revisão" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
];

const FUNNEL_OPTIONS = [
  { value: "top", label: "Topo" },
  { value: "mid", label: "Meio" },
  { value: "bottom", label: "Fundo" },
] as const;

const FUNNEL_FILTER_OPTIONS = [
  { value: "top", label: "Topo" },
  { value: "mid", label: "Meio" },
  { value: "bottom", label: "Fundo" },
];

export const CopiesTab = ({ activationId, briefDone }: CopiesTabProps) => {
  const queryClient = useQueryClient();
  const [copies, setCopies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<PurposeFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // New filters
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [funnelFilter, setFunnelFilter] = useState<string | null>(null);
  const [batchFilter, setBatchFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set());

  // Generation dialog state
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [genPurpose, setGenPurpose] = useState<GeneratePurpose>("both");
  const [genFunnelStages, setGenFunnelStages] = useState<string[]>(["top", "mid", "bottom"]);
  const [genQuantity, setGenQuantity] = useState(6);
  const [genTopic, setGenTopic] = useState("");

  const [form, setForm] = useState({
    type: "post",
    channel: "",
    funnel_stage: "top",
    purpose: "organic" as "organic" | "ads",
    hook: "",
    body: "",
    cta: "",
    landing_page_url: "",
  });

  const fetchCopies = async () => {
    const { data } = await supabase
      .from("copies")
      .select("*")
      .eq("activation_id", activationId)
      .order("created_at", { ascending: false });
    setCopies(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCopies(); }, [activationId]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Excluir ${selected.size} copy(ies) permanentemente?`)) return;
    setDeleting(true);
    const ids = Array.from(selected);
    await supabase.from("assets").update({ copy_id: null }).in("copy_id", ids);
    const { error } = await supabase.from("copies").delete().in("id", ids);
    if (error) {
      toast.error("Erro ao excluir copies");
    } else {
      toast.success(`${ids.length} copy(ies) excluído(s)`);
      setSelected(new Set());
      fetchCopies();
      queryClient.invalidateQueries({ queryKey: ["activation-hub", activationId] });
    }
    setDeleting(false);
  };

  // Apply all filters
  const filtered = useMemo(() => {
    let result = copies;
    if (filter !== "all") result = result.filter(c => (c.purpose || "organic") === filter);
    if (statusFilter) result = result.filter(c => c.status === statusFilter);
    if (funnelFilter) result = result.filter(c => c.funnel_stage === funnelFilter);
    if (batchFilter) result = result.filter(c => c.batch_label === batchFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => (c.hook || "").toLowerCase().includes(q) || (c.body || "").toLowerCase().includes(q));
    }
    return result;
  }, [copies, filter, statusFilter, funnelFilter, batchFilter, searchQuery]);

  // Group by batch
  const batchGroups = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const c of filtered) {
      const label = c.batch_label || "Sem lote";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(c);
    }
    return groups;
  }, [filtered]);

  // Get unique batch labels for filter
  const batchLabels = useMemo(() => {
    const labels = new Set<string>();
    copies.forEach(c => { if (c.batch_label) labels.add(c.batch_label); });
    return Array.from(labels).sort();
  }, [copies]);

  // Group variations under parent
  const getVariationLetter = (copy: any, allCopies: any[]) => {
    if (!copy.parent_id) return null;
    const siblings = allCopies.filter(c => c.parent_id === copy.parent_id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const idx = siblings.findIndex(c => c.id === copy.id);
    return String.fromCharCode(66 + idx); // B, C, D...
  };

  const orgCount = copies.filter(c => (c.purpose || "organic") === "organic").length;
  const adsCount = copies.filter(c => (c.purpose || "organic") === "ads").length;

  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  };

  const toggleBatchCollapse = (label: string) => {
    setCollapsedBatches(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("copies").insert([{
      activation_id: activationId,
      ...form,
      full_copy: `${form.hook}\n\n${form.body}\n\n${form.cta}`,
    }]);
    if (!error) {
      setShowForm(false);
      setForm({ type: "post", channel: "", funnel_stage: "top", purpose: "organic", hook: "", body: "", cta: "", landing_page_url: "" });
      fetchCopies();
    }
    setSaving(false);
  };

  const toggleFunnelStage = (stage: string) => {
    setGenFunnelStages(prev =>
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    );
  };

  const handleAIGenerate = async () => {
    if (genFunnelStages.length === 0) {
      toast.error("Selecione pelo menos uma etapa do funil.");
      return;
    }
    setGenerating(true);
    setShowGenDialog(false);
    try {
      const [briefRes, actRes] = await Promise.all([
        supabase.from("briefs").select("*").eq("activation_id", activationId).single(),
        supabase.from("activations").select("name").eq("id", activationId).single(),
      ]);

      if (!briefRes.data || !briefRes.data.objectives) {
        toast.error("Brief incompleto. Preencha o brief antes de gerar copies.");
        setGenerating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-copies", {
        body: {
          activation_id: activationId,
          activation_name: actRes.data?.name || "",
          brief: briefRes.data,
          channels: ["instagram", "facebook"],
          funnel_stages: genFunnelStages,
          purpose: genPurpose,
          quantity: genQuantity,
          topic: genTopic || undefined,
        },
      });

      if (error) throw error;

      toast.success(`${data.copies?.length || 0} copies gerados — ${data.batch_label || ""}`, {
        description: "Copies organizados em lote automaticamente.",
      });
      fetchCopies();
    } catch (err) {
      console.error("AI generation error:", err);
      toast.error("Erro ao gerar copies com IA. Tente novamente.");
    }
    setGenerating(false);
  };

  const hasActiveFilters = statusFilter || funnelFilter || batchFilter || searchQuery.trim();

  if (loading) return <div className="text-caption">Carregando...</div>;

  const renderCopyRow = (copy: any) => {
    const purpose = copy.purpose || "organic";
    const isSelected = selected.has(copy.id);
    const varLetter = getVariationLetter(copy, copies);

    return (
      <TableRow
        key={copy.id}
        className="cursor-pointer"
        style={{ borderColor: "hsl(var(--border-subtle))" }}
        data-state={isSelected ? "selected" : undefined}
      >
        <TableCell className="py-2">
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(copy.id)} />
        </TableCell>
        <TableCell className="py-2">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: `hsl(var(${purposeColor[purpose]}) / 0.12)`,
                color: `hsl(var(${purposeColor[purpose]}))`,
                border: `1px solid hsl(var(${purposeColor[purpose]}) / 0.25)`,
              }}
            >
              {purposeLabel[purpose]}
            </span>
            {varLetter && (
              <span
                className="text-[9px] font-bold px-1 py-0.5 rounded"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: "hsl(var(--accent) / 0.1)",
                  color: "hsl(var(--accent))",
                  border: "1px solid hsl(var(--accent) / 0.2)",
                }}
              >
                <GitBranch size={8} className="inline mr-0.5" />Var {varLetter}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2">
          <Link
            to={`/activations/${activationId}/copies/${copy.id}`}
            className="text-body text-sm hover:underline line-clamp-1"
            style={{ color: "hsl(var(--text-primary))" }}
          >
            {copy.hook || "Copy sem gancho"}
          </Link>
        </TableCell>
        <TableCell className="py-2">
          <span className="text-mono-label">{copy.type} · {copy.channel || "—"}</span>
        </TableCell>
        <TableCell className="py-2">
          <span className="text-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--bg-surface2))", color: "hsl(var(--text-muted))" }}>
            {copy.funnel_stage || "—"}
          </span>
        </TableCell>
        <TableCell className="py-2 text-right">
          <StatusBadge status={copy.status} />
        </TableCell>
      </TableRow>
    );
  };

  const renderCopyCard = (copy: any) => {
    const purpose = copy.purpose || "organic";
    const isSelected = selected.has(copy.id);
    const varLetter = getVariationLetter(copy, copies);

    return (
      <div key={copy.id} className="flex items-start gap-2">
        <div className="pt-4">
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(copy.id)} />
        </div>
        <Link
          to={`/activations/${activationId}/copies/${copy.id}`}
          className="card-base card-interactive block flex-1"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: `hsl(var(${purposeColor[purpose]}) / 0.12)`,
                  color: `hsl(var(${purposeColor[purpose]}))`,
                  border: `1px solid hsl(var(${purposeColor[purpose]}) / 0.25)`,
                }}
              >
                {purposeLabel[purpose]}
              </span>
              {varLetter && (
                <span
                  className="text-[9px] font-bold px-1 py-0.5 rounded"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    background: "hsl(var(--accent) / 0.1)",
                    color: "hsl(var(--accent))",
                  }}
                >
                  <GitBranch size={8} className="inline mr-0.5" />Var {varLetter}
                </span>
              )}
              <span className="text-mono-label">
                {copy.type} · {copy.channel || "—"} · v{copy.version}
              </span>
            </div>
            <StatusBadge status={copy.status} />
          </div>
          <p className="text-body line-clamp-2">{copy.hook || "Copy sem gancho"}</p>
          {copy.funnel_stage && (
            <span className="text-mono mt-2 inline-block px-1.5 py-0.5 rounded bg-surface-2 text-txt-muted">
              {copy.funnel_stage}
            </span>
          )}
        </Link>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <SectionLabel>Copies</SectionLabel>
        <div className="flex gap-2">
         <div className="flex items-center gap-1 mr-1" style={{ background: "hsl(var(--bg-surface2))", borderRadius: 6, padding: 2 }}>
            {(["list", "grid"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="p-1.5 rounded transition-all"
                style={{
                  background: viewMode === mode ? "hsl(var(--accent) / 0.12)" : "transparent",
                  color: viewMode === mode ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
                }}
              >
                {mode === "list" ? <LayoutList size={14} /> : <LayoutGrid size={14} />}
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Excluir ({selected.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowGenDialog(true)}
            disabled={generating}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generating ? "Gerando..." : "Gerar com IA"}
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Novo copy
          </Button>
        </div>
      </div>

      {/* AI Generation Dialog */}
      <Dialog open={showGenDialog} onOpenChange={setShowGenDialog}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: "hsl(var(--bg-surface2))",
            border: "1px solid hsl(var(--border-subtle))",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-heading-sm" style={{ color: "hsl(var(--text-primary))" }}>
              Configurar geração IA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Purpose */}
            <div>
              <Label className="field-label mb-2 block">Finalidade</Label>
              <div className="flex gap-2">
                {(["organic", "ads", "both"] as GeneratePurpose[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setGenPurpose(p)}
                    className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      background: genPurpose === p ? "hsl(var(--accent) / 0.12)" : "hsl(var(--bg-base))",
                      color: genPurpose === p ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
                      border: `1px solid ${genPurpose === p ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border-subtle))"}`,
                    }}
                  >
                    {p === "organic" ? "🌱 Orgânico" : p === "ads" ? "📢 Ads" : "🌱📢 Ambos"}
                  </button>
                ))}
              </div>
            </div>

            {/* Funnel stages */}
            <div>
              <Label className="field-label mb-2 block">Etapas do funil</Label>
              <div className="flex gap-4">
                {FUNNEL_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={genFunnelStages.includes(opt.value)}
                      onCheckedChange={() => toggleFunnelStage(opt.value)}
                    />
                    <span className="text-body-sm" style={{ color: "hsl(var(--text-primary))" }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <Label className="field-label mb-2 block">Quantidade de copies</Label>
              <input
                type="number"
                min={1}
                max={20}
                value={genQuantity}
                onChange={(e) => setGenQuantity(Math.min(20, Math.max(1, Number(e.target.value))))}
                className="field-input w-24"
              />
              <span className="text-mono ml-2" style={{ color: "hsl(var(--text-muted))" }}>máx 20</span>
            </div>

            {/* Topic */}
            <div>
              <Label className="field-label mb-2 block">Assunto / Dor específica (opcional)</Label>
              <Textarea
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder="Ex: insegurança sobre investimentos, falta de tempo para cozinhar..."
                rows={3}
                className="field-input field-textarea"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenDialog(false)}>Cancelar</Button>
            <Button onClick={handleAIGenerate} className="gap-2">
              <Sparkles size={14} /> Gerar copies
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter chips row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Purpose filter */}
        {([
          { key: "all" as PurposeFilter, label: "Todos", count: copies.length },
          { key: "organic" as PurposeFilter, label: "Orgânico", count: orgCount },
          { key: "ads" as PurposeFilter, label: "Ads", count: adsCount },
        ]).map((chip) => (
          <button
            key={chip.key}
            onClick={() => setFilter(chip.key)}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: filter === chip.key ? "hsl(var(--accent) / 0.12)" : "hsl(var(--bg-surface2))",
              color: filter === chip.key ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
              border: `1px solid ${filter === chip.key ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border-subtle))"}`,
            }}
          >
            {chip.label} ({chip.count})
          </button>
        ))}

        <span className="w-px h-5 mx-1" style={{ background: "hsl(var(--border-subtle))" }} />

        {/* Status filter */}
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(statusFilter === opt.value ? null : opt.value)}
            className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: statusFilter === opt.value ? "hsl(var(--accent) / 0.12)" : "transparent",
              color: statusFilter === opt.value ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
              border: `1px solid ${statusFilter === opt.value ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border-subtle))"}`,
            }}
          >
            {opt.label}
          </button>
        ))}

        <span className="w-px h-5 mx-1" style={{ background: "hsl(var(--border-subtle))" }} />

        {/* Funnel filter */}
        {FUNNEL_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFunnelFilter(funnelFilter === opt.value ? null : opt.value)}
            className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: funnelFilter === opt.value ? "hsl(var(--accent) / 0.12)" : "transparent",
              color: funnelFilter === opt.value ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
              border: `1px solid ${funnelFilter === opt.value ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border-subtle))"}`,
            }}
          >
            {opt.label}
          </button>
        ))}

        {/* Batch filter */}
        {batchLabels.length > 0 && (
          <>
            <span className="w-px h-5 mx-1" style={{ background: "hsl(var(--border-subtle))" }} />
            {batchLabels.map((label) => (
              <button
                key={label}
                onClick={() => setBatchFilter(batchFilter === label ? null : label)}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: batchFilter === label ? "hsl(var(--accent) / 0.12)" : "transparent",
                  color: batchFilter === label ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
                  border: `1px solid ${batchFilter === label ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border-subtle))"}`,
                }}
              >
                {label}
              </button>
            ))}
          </>
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--text-muted))" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar hook..."
            className="pl-7 pr-3 py-1.5 rounded-md text-[11px] w-44"
            style={{
              background: "hsl(var(--bg-surface2))",
              border: "1px solid hsl(var(--border-subtle))",
              color: "hsl(var(--text-primary))",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px]" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace" }}>
            {filtered.length} resultado(s)
          </span>
          <button
            onClick={() => { setStatusFilter(null); setFunnelFilter(null); setBatchFilter(null); setSearchQuery(""); }}
            className="text-[10px] underline"
            style={{ color: "hsl(var(--accent))" }}
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* New Copy Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card-base mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="field-label">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="field-input">
                <option value="post">Post</option>
                <option value="ad">Ad</option>
                <option value="landing">Landing</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className="field-label">Canal</label>
              <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="field-input" placeholder="Instagram, Facebook..." />
            </div>
            <div>
              <label className="field-label">Funil</label>
              <select value={form.funnel_stage} onChange={(e) => setForm({ ...form, funnel_stage: e.target.value })} className="field-input">
                <option value="top">Topo</option>
                <option value="mid">Meio</option>
                <option value="bottom">Fundo</option>
              </select>
            </div>
            <div>
              <label className="field-label">Finalidade</label>
              <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value as "organic" | "ads" })} className="field-input">
                <option value="organic">🌱 Orgânico</option>
                <option value="ads">📢 Ads</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Gancho</label>
            <textarea value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} rows={2} className="field-input field-textarea" placeholder="Primeira linha que captura atenção..." />
          </div>
          <div>
            <label className="field-label">Corpo</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} className="field-input field-textarea" placeholder="Desenvolvimento do argumento..." />
          </div>
          <div>
            <label className="field-label">CTA</label>
            <textarea value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} rows={2} className="field-input field-textarea" placeholder="Chamada para ação..." />
          </div>
          <div>
            <label className="field-label">Landing page (override)</label>
            <input value={form.landing_page_url} onChange={(e) => setForm({ ...form, landing_page_url: e.target.value })} className="field-input" placeholder="https://..." />
          </div>
          <div className="form__footer">
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Criando..." : "Criar copy"}</Button>
          </div>
        </form>
      )}

      {/* Generating banner */}
      {generating && (
        <div className="card-base flex items-center gap-3 mb-4" style={{ borderColor: "hsl(var(--accent) / 0.3)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-xs" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
            Gerando {genQuantity} copies com IA, aguarde...
          </span>
        </div>
      )}

      {/* Copies List — grouped by batch */}
      {filtered.length === 0 ? (
        <div className="empty-state card-base">
          <FileText size={32} className="text-txt-ghost" />
          <p className="empty-state__title">
            {hasActiveFilters ? "Nenhum copy encontrado com esses filtros" : filter !== "all" ? `Nenhum copy ${filter === "organic" ? "orgânico" : "ads"} ainda` : "Nenhum copy ainda"}
          </p>
          <p className="empty-state__desc">
            {hasActiveFilters
              ? "Tente alterar os filtros."
              : briefDone === false
                ? "Preencha o brief primeiro para gerar copies com IA."
                : "Clique em 'Gerar com IA' para criar copies a partir do brief."}
          </p>
          {!hasActiveFilters && briefDone === false ? (
            <Link
              to={`/activations/${activationId}/brief`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md transition-all"
              style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-inverse))", borderRadius: 6 }}
            >
              ← Preencher brief primeiro
            </Link>
          ) : !hasActiveFilters ? (
            <Button
              size="sm"
              className="mt-3 gap-2"
              onClick={() => setShowGenDialog(true)}
              style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", borderRadius: 6 }}
            >
              <Sparkles size={14} /> Gerar com IA
            </Button>
          ) : null}
        </div>
      ) : (
        Array.from(batchGroups.entries()).map(([batchLabel, batchCopies]) => {
          const isCollapsed = collapsedBatches.has(batchLabel);
          const approvedCount = batchCopies.filter(c => c.status === "approved").length;

          return (
            <div key={batchLabel} className="mb-4">
              {/* Batch header */}
              {batchGroups.size > 1 || batchLabel !== "Sem lote" ? (
                <button
                  onClick={() => toggleBatchCollapse(batchLabel)}
                  className="flex items-center gap-2 w-full py-2 px-3 rounded-md mb-2 transition-colors hover:bg-accent/5"
                  style={{ background: "hsl(var(--bg-surface2))" }}
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <span className="text-[11px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-primary))" }}>
                    {batchLabel}
                  </span>
                  <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                    {batchCopies.length} copies · {approvedCount} aprovados
                  </span>
                </button>
              ) : null}

              {!isCollapsed && (
                viewMode === "list" ? (
                  <Table>
                    <TableHeader>
                      <TableRow style={{ borderColor: "hsl(var(--border-subtle))" }}>
                        <TableHead className="w-10">
                          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                        </TableHead>
                        <TableHead className="w-20 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>Tipo</TableHead>
                        <TableHead className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>Gancho</TableHead>
                        <TableHead className="w-28 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>Canal</TableHead>
                        <TableHead className="w-20 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>Funil</TableHead>
                        <TableHead className="w-24 text-[10px] text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchCopies.map(renderCopyRow)}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {batchCopies.map(renderCopyCard)}
                  </div>
                )
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
