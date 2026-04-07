import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { BriefVisualIdentity } from "@/components/activation/BriefVisualIdentity";
import { BriefFilesSection } from "@/components/activation/BriefFilesSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BriefTabProps {
  activationId: string;
}

export const BriefTab = ({ activationId }: BriefTabProps) => {
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [briefFiles, setBriefFiles] = useState<any[]>([]);
  const [form, setForm] = useState({
    tone_of_voice: "",
    target_audience: "",
    objectives: "",
    extra_context: "",
    references_urls: [] as string[],
    brand_colors: "",
    typography: "",
    visual_style: "",
  });
  const [refInput, setRefInput] = useState("");
  const [extractedHighlight, setExtractedHighlight] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      // Fetch brief and files in parallel
      const [briefRes, filesRes] = await Promise.all([
        supabase.from("briefs").select("*").eq("activation_id", activationId).single(),
        supabase.from("brief_files" as any).select("*").eq("activation_id", activationId).order("created_at", { ascending: true }),
      ]);

      if (briefRes.data) {
        const data = briefRes.data;
        setBrief(data);
        setForm({
          tone_of_voice: data.tone_of_voice || "",
          target_audience: data.target_audience || "",
          objectives: data.objectives || "",
          extra_context: data.extra_context || "",
          references_urls: data.references_urls || [],
          brand_colors: (data as any).brand_colors || "",
          typography: (data as any).typography || "",
          visual_style: (data as any).visual_style || "",
        });
      }

      if (filesRes.data) {
        setBriefFiles(filesRes.data as any[]);
      }

      setLoading(false);
    };
    fetchData();
  }, [activationId]);

  const handleSave = async () => {
    setSaving(true);
    if (brief) {
      await supabase.from("briefs").update({ ...form, updated_at: new Date().toISOString() }).eq("id", brief.id);
    } else {
      const { data } = await supabase.from("briefs").insert([{ activation_id: activationId, ...form }]).select().single();
      if (data) setBrief(data);
    }
    setSaving(false);
    toast({ title: "Brief salvo!" });
  };

  const handleExtracted = (ex: any) => {
    const highlights: Record<string, boolean> = {};
    const newForm = { ...form };
    (["tone_of_voice", "target_audience", "objectives", "extra_context"] as const).forEach((key) => {
      if (ex[key] && ex[key].trim()) {
        // Only fill if field is currently empty
        if (!newForm[key]) {
          newForm[key] = ex[key];
          highlights[key] = true;
        }
      }
    });
    if (ex.references_urls?.length) {
      newForm.references_urls = [...new Set([...newForm.references_urls, ...ex.references_urls])];
      highlights["references_urls"] = true;
    }
    setForm(newForm);
    setExtractedHighlight((prev) => ({ ...prev, ...highlights }));
  };

  const handleAddRef = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && refInput.trim()) {
      e.preventDefault();
      setForm({ ...form, references_urls: [...form.references_urls, refInput.trim()] });
      setRefInput("");
    }
  };

  const getHighlightClass = (field: string) => {
    if (extractedHighlight[field] === true) {
      return "field-input !border-[hsl(var(--accent))] shadow-[0_0_0_1px_hsl(var(--accent)/0.25)]";
    } else if (extractedHighlight[field] === false) {
      return "field-input !border-[hsl(var(--status-review))] shadow-[0_0_0_1px_hsl(var(--status-review)/0.25)]";
    }
    return "field-input";
  };

  if (loading) return <div className="text-sm" style={{ color: "hsl(var(--text-muted)" }}>Carregando...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <SectionLabel>Brief da Ativação</SectionLabel>

      {/* Multi-file upload */}
      <div>
        <label className="field-label">Arquivos de referência</label>
        <BriefFilesSection
          activationId={activationId}
          files={briefFiles}
          onFilesChange={setBriefFiles}
          onExtracted={handleExtracted}
        />
      </div>

      <div>
        <label className="field-label">Tom de voz</label>
        <input
          value={form.tone_of_voice}
          onChange={(e) => setForm({ ...form, tone_of_voice: e.target.value })}
          className={getHighlightClass("tone_of_voice")}
          placeholder="Ex: profissional, descontraído, urgente..."
        />
      </div>

      <div>
        <label className="field-label">Público-alvo</label>
        <textarea
          value={form.target_audience}
          onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
          rows={3}
          className={`${getHighlightClass("target_audience")} field-textarea`}
          placeholder="Descreva o público-alvo..."
        />
      </div>

      <div>
        <label className="field-label">Objetivos</label>
        <textarea
          value={form.objectives}
          onChange={(e) => setForm({ ...form, objectives: e.target.value })}
          rows={3}
          className={`${getHighlightClass("objectives")} field-textarea`}
          placeholder="Quais são os objetivos desta ativação?"
        />
      </div>

      <div>
        <label className="field-label">Contexto adicional</label>
        <textarea
          value={form.extra_context}
          onChange={(e) => setForm({ ...form, extra_context: e.target.value })}
          rows={3}
          className={`${getHighlightClass("extra_context")} field-textarea`}
          placeholder="Informações extras relevantes..."
        />
      </div>

      {/* Identidade Visual */}
      <div className="pt-6 mt-2" style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
        <BriefVisualIdentity
          brandColors={form.brand_colors}
          typography={form.typography}
          visualStyle={form.visual_style}
          onChange={(field, value) => setForm({ ...form, [field]: value })}
          highlightClass={getHighlightClass}
        />
      </div>

      <div>
        <label className="field-label">Referências (URLs)</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.references_urls.map((url, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-pointer"
              style={{ background: "hsl(var(--bg-surface3))", color: "hsl(var(--text-secondary))", fontFamily: "'JetBrains Mono', monospace" }}
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
          className={getHighlightClass("references_urls")}
          placeholder="Cole a URL e pressione Enter"
        />
      </div>

      <div
        className="flex justify-end gap-2 mt-6 pt-5"
        style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-xs font-medium rounded-md disabled:opacity-40"
          style={{
            background: "hsl(var(--accent))",
            color: "hsl(var(--text-inverse))",
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: 6,
            border: "1px solid hsl(var(--accent))",
            transition: "all 0.15s ease",
            letterSpacing: "0.2px",
          }}
        >
          {saving ? "Salvando..." : brief ? "Atualizar brief" : "Salvar brief"}
        </button>
      </div>
    </div>
  );
};
