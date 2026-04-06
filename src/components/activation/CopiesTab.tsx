import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
      // Fetch brief and activation info
      const [briefRes, actRes] = await Promise.all([
        supabase.from("briefs").select("*").eq("activation_id", activationId).single(),
        supabase.from("activations").select("name").eq("id", activationId).single(),
      ]);

      if (!briefRes.data || !briefRes.data.objectives) {
        toast({
          title: "Brief incompleto",
          description: "Preencha o brief da ativação antes de gerar copies com IA.",
          variant: "destructive",
        });
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

      toast({
        title: "Copies gerados!",
        description: `${data.copies?.length || 0} copies criados com IA.`,
      });
      fetchCopies();
    } catch (err) {
      console.error("AI generation error:", err);
      toast({
        title: "Erro ao gerar",
        description: "Não foi possível gerar copies com IA. Tente novamente.",
        variant: "destructive",
      });
    }
    setGenerating(false);
  };

  const inputStyle = {
    background: "var(--bg-base)",
    border: "1px solid var(--border-strong)",
    color: "var(--text-primary)",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: 6,
  };

  if (loading) return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <SectionLabel>Copies</SectionLabel>
        <div className="flex gap-2">
          <button
            onClick={handleAIGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 disabled:opacity-50"
            style={{
              background: "color-mix(in srgb, var(--accent) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              color: "var(--accent)",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
            }}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generating ? "Gerando..." : "Gerar com IA"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150"
            style={{ background: "var(--accent)", color: "var(--text-inverse)", fontFamily: "'DM Sans'", borderRadius: 6 }}
          >
            <Plus size={14} />
            Novo copy
          </button>
        </div>
      </div>

      {/* New Copy Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-lg mb-6 space-y-4"
          style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle}>
                <option value="post">Post</option>
                <option value="ad">Ad</option>
                <option value="landing">Landing</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>Canal</label>
              <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="Instagram, Facebook..." />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>Funil</label>
              <select value={form.funnel_stage} onChange={(e) => setForm({ ...form, funnel_stage: e.target.value })} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle}>
                <option value="top">Topo</option>
                <option value="mid">Meio</option>
                <option value="bottom">Fundo</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>Gancho</label>
            <textarea value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} rows={2} className="w-full px-3 py-2.5 text-sm outline-none resize-none" style={inputStyle} placeholder="Primeira linha que captura atenção..." />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>Corpo</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} className="w-full px-3 py-2.5 text-sm outline-none resize-none" style={inputStyle} placeholder="Desenvolvimento do argumento..." />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>CTA</label>
            <textarea value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} rows={2} className="w-full px-3 py-2.5 text-sm outline-none resize-none" style={inputStyle} placeholder="Chamada para ação..." />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>Landing page (override)</label>
            <input value={form.landing_page_url} onChange={(e) => setForm({ ...form, landing_page_url: e.target.value })} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="https://..." />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium rounded-md disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--text-inverse)", fontFamily: "'DM Sans'", borderRadius: 6 }}>
              {saving ? "Criando..." : "Criar copy"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 text-sm font-medium rounded-md" style={{ background: "var(--bg-surface2)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "'DM Sans'", borderRadius: 6 }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Copies List */}
      {copies.length === 0 ? (
        <div className="p-8 rounded-lg text-center" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
          <FileText size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>Nenhum copy ainda</p>
          {briefDone === false ? (
            <Link
              to={`/activations/${activationId}/brief`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md transition-all"
              style={{ background: "var(--accent)", color: "var(--text-inverse)", borderRadius: 6 }}
            >
              ← Preencher brief primeiro
            </Link>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>
              Clique em "Gerar com IA" para criar copies a partir do brief
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {copies.map((copy) => (
            <Link
              key={copy.id}
              to={`/activations/${activationId}/copies/${copy.id}`}
              className="flex items-center justify-between p-4 rounded-lg transition-all duration-150 hover:border-opacity-80"
              style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans'" }}>
                  {copy.hook || "Copy sem gancho"}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                    {copy.type} · {copy.channel || "—"} · v{copy.version}
                  </span>
                </div>
              </div>
              <StatusBadge status={copy.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
