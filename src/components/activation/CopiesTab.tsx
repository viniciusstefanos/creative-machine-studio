import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Sparkles, Loader2 } from "lucide-react";
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

export const CopiesTab = ({ activationId, briefDone }: CopiesTabProps) => {
  const [copies, setCopies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<PurposeFilter>("all");
  const [genPurpose, setGenPurpose] = useState<GeneratePurpose>("both");
  const [showGenSelect, setShowGenSelect] = useState(false);
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

  const filtered = filter === "all" ? copies : copies.filter(c => (c.purpose || "organic") === filter);
  const orgCount = copies.filter(c => (c.purpose || "organic") === "organic").length;
  const adsCount = copies.filter(c => (c.purpose || "organic") === "ads").length;

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

  const handleAIGenerate = async () => {
    setGenerating(true);
    setShowGenSelect(false);
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
          funnel_stages: ["top", "mid", "bottom"],
          purpose: genPurpose,
        },
      });

      if (error) throw error;

      toast.success(`${data.copies?.length || 0} copies gerados com IA`);
      fetchCopies();
    } catch (err) {
      console.error("AI generation error:", err);
      toast.error("Erro ao gerar copies com IA. Tente novamente.");
    }
    setGenerating(false);
  };

  if (loading) return <div className="text-caption">Carregando...</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <SectionLabel>Copies</SectionLabel>
        <div className="flex gap-2">
          {/* Generation with purpose selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowGenSelect(!showGenSelect)}
              disabled={generating}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? "Gerando..." : "Gerar com IA"}
            </Button>
            {showGenSelect && !generating && (
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-md py-1 min-w-[160px]"
                style={{
                  background: "hsl(var(--bg-surface2))",
                  border: "1px solid hsl(var(--border-subtle))",
                  boxShadow: "0 8px 24px hsl(var(--bg-base) / 0.5)",
                }}
              >
                {(["organic", "ads", "both"] as GeneratePurpose[]).map((p) => (
                  <button
                    key={p}
                    className="w-full text-left px-3 py-2 text-body-sm transition-colors"
                    style={{
                      color: genPurpose === p ? "hsl(var(--accent))" : "hsl(var(--text-primary))",
                      background: genPurpose === p ? "hsl(var(--accent) / 0.08)" : "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--accent) / 0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = genPurpose === p ? "hsl(var(--accent) / 0.08)" : "transparent")}
                    onClick={() => {
                      setGenPurpose(p);
                      handleAIGenerate();
                    }}
                  >
                    {p === "organic" ? "🌱 Orgânico" : p === "ads" ? "📢 Ads" : "🌱📢 Ambos"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Novo copy
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4">
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
      </div>

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

      {/* Copies List */}
      {filtered.length === 0 ? (
        <div className="empty-state card-base">
          <FileText size={32} className="text-txt-ghost" />
          <p className="empty-state__title">
            {filter !== "all" ? `Nenhum copy ${filter === "organic" ? "orgânico" : "ads"} ainda` : "Nenhum copy ainda"}
          </p>
          <p className="empty-state__desc">
            {briefDone === false
              ? "Preencha o brief primeiro para gerar copies com IA."
              : "Clique em 'Gerar com IA' para criar copies a partir do brief."}
          </p>
          {briefDone === false && (
            <Link
              to={`/activations/${activationId}/brief`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md transition-all"
              style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-inverse))", borderRadius: 6 }}
            >
              ← Preencher brief primeiro
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((copy) => {
            const purpose = copy.purpose || "organic";
            return (
              <Link
                key={copy.id}
                to={`/activations/${activationId}/copies/${copy.id}`}
                className="card-base card-interactive block"
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
            );
          })}
        </div>
      )}
    </div>
  );
};
