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

export const CopiesTab = ({ activationId, briefDone }: CopiesTabProps) => {
  const [copies, setCopies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    type: "post",
    channel: "",
    funnel_stage: "top",
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
      setForm({ type: "post", channel: "", funnel_stage: "top", hook: "", body: "", cta: "", landing_page_url: "" });
      fetchCopies();
    }
    setSaving(false);
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
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
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAIGenerate}
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

      {/* New Copy Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card-base mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      {copies.length === 0 ? (
        <div className="empty-state card-base">
          <FileText size={32} className="text-txt-ghost" />
          <p className="empty-state__title">Nenhum copy ainda</p>
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
          {copies.map((copy) => (
            <Link
              key={copy.id}
              to={`/activations/${activationId}/copies/${copy.id}`}
              className="card-base card-interactive block"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-mono-label">
                  {copy.type} · {copy.channel || "—"} · v{copy.version}
                </span>
                <StatusBadge status={copy.status} />
              </div>
              <p className="text-body line-clamp-2">{copy.hook || "Copy sem gancho"}</p>
              {copy.funnel_stage && (
                <span className="text-mono mt-2 inline-block px-1.5 py-0.5 rounded bg-surface-2 text-txt-muted">
                  {copy.funnel_stage}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
