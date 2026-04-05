import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";

interface BriefTabProps {
  activationId: string;
}

export const BriefTab = ({ activationId }: BriefTabProps) => {
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tone_of_voice: "",
    target_audience: "",
    objectives: "",
    extra_context: "",
    references_urls: [] as string[],
  });
  const [refInput, setRefInput] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("briefs")
        .select("*")
        .eq("activation_id", activationId)
        .single();
      if (data) {
        setBrief(data);
        setForm({
          tone_of_voice: data.tone_of_voice || "",
          target_audience: data.target_audience || "",
          objectives: data.objectives || "",
          extra_context: data.extra_context || "",
          references_urls: data.references_urls || [],
        });
      }
      setLoading(false);
    };
    fetch();
  }, [activationId]);

  const handleSave = async () => {
    setSaving(true);
    if (brief) {
      await supabase.from("briefs").update({ ...form, updated_at: new Date().toISOString() }).eq("id", brief.id);
    } else {
      await supabase.from("briefs").insert([{ activation_id: activationId, ...form }]);
    }
    setSaving(false);
  };

  const handleAddRef = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && refInput.trim()) {
      e.preventDefault();
      setForm({ ...form, references_urls: [...form.references_urls, refInput.trim()] });
      setRefInput("");
    }
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
    <div className="max-w-2xl space-y-6">
      <SectionLabel>Brief da Ativação</SectionLabel>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
          Tom de voz
        </label>
        <input
          value={form.tone_of_voice}
          onChange={(e) => setForm({ ...form, tone_of_voice: e.target.value })}
          className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-150"
          style={inputStyle}
          placeholder="Ex: profissional, descontraído, urgente..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
          Público-alvo
        </label>
        <textarea
          value={form.target_audience}
          onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 text-sm outline-none resize-none transition-all duration-150"
          style={inputStyle}
          placeholder="Descreva o público-alvo..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
          Objetivos
        </label>
        <textarea
          value={form.objectives}
          onChange={(e) => setForm({ ...form, objectives: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 text-sm outline-none resize-none transition-all duration-150"
          style={inputStyle}
          placeholder="Quais são os objetivos desta ativação?"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
          Contexto adicional
        </label>
        <textarea
          value={form.extra_context}
          onChange={(e) => setForm({ ...form, extra_context: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 text-sm outline-none resize-none transition-all duration-150"
          style={inputStyle}
          placeholder="Informações extras relevantes..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
          Referências (URLs)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.references_urls.map((url, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-pointer"
              style={{ background: "var(--bg-surface3)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
              onClick={() => setForm({ ...form, references_urls: form.references_urls.filter((_, idx) => idx !== i) })}
            >
              {url.length > 40 ? url.slice(0, 40) + "..." : url} ×
            </span>
          ))}
        </div>
        <input
          value={refInput}
          onChange={(e) => setRefInput(e.target.value)}
          onKeyDown={handleAddRef}
          className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-150"
          style={inputStyle}
          placeholder="Cole a URL e pressione Enter"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-150 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--text-inverse)", fontFamily: "'DM Sans'", borderRadius: 6 }}
      >
        {saving ? "Salvando..." : brief ? "Atualizar brief" : "Salvar brief"}
      </button>
    </div>
  );
};
