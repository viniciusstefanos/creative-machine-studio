import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FileDrop } from "@/components/ui/FileDrop";
import { BriefVisualIdentity } from "@/components/activation/BriefVisualIdentity";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface BriefTabProps {
  activationId: string;
}

export const BriefTab = ({ activationId }: BriefTabProps) => {
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [form, setForm] = useState({
    tone_of_voice: "",
    target_audience: "",
    objectives: "",
    extra_context: "",
    references_urls: [] as string[],
  });
  const [refInput, setRefInput] = useState("");
  const [extractedHighlight, setExtractedHighlight] = useState<Record<string, boolean>>({});

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
        if (data.source_file_url) {
          const parts = data.source_file_url.split("/");
          setFileName(parts[parts.length - 1]);
        }
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
    toast({ title: "Brief salvo!" });
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setFileName(file.name);
    const filePath = `${activationId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("briefs").upload(filePath, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setUploading(false);
      setFileName("");
      return;
    }

    // Save file URL to brief
    const updates = { source_file_url: filePath };
    if (brief) {
      await supabase.from("briefs").update(updates).eq("id", brief.id);
    } else {
      const { data } = await supabase.from("briefs").insert([{ activation_id: activationId, ...updates }]).select().single();
      if (data) setBrief(data);
    }
    setUploading(false);

    // Extract with AI
    setExtracting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("extract-brief", {
        body: { file_path: filePath },
      });
      if (fnError) throw fnError;
      if (data?.extracted) {
        const ex = data.extracted;
        const highlights: Record<string, boolean> = {};
        const newForm = { ...form };
        (["tone_of_voice", "target_audience", "objectives", "extra_context"] as const).forEach((key) => {
          if (ex[key] && ex[key].trim()) {
            newForm[key] = ex[key];
            highlights[key] = true;
          } else if (!newForm[key]) {
            highlights[key] = false; // empty = warn
          }
        });
        if (ex.references_urls?.length) {
          newForm.references_urls = [...new Set([...newForm.references_urls, ...ex.references_urls])];
          highlights["references_urls"] = true;
        }
        setForm(newForm);
        setExtractedHighlight(highlights);
        toast({ title: "Campos extraídos com IA", description: "Revise os campos destacados antes de salvar." });
      }
    } catch (err) {
      console.error("Extract error:", err);
      toast({ title: "Erro na extração", description: "Não foi possível extrair campos do arquivo.", variant: "destructive" });
    }
    setExtracting(false);
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

  if (loading) return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <SectionLabel>Brief da Ativação</SectionLabel>

      {/* File Upload */}
      <div>
        <label className="field-label">Arquivo de briefing</label>
        <FileDrop
          onFile={handleFileUpload}
          uploading={uploading}
          fileName={fileName}
          onClear={() => setFileName("")}
        />
        {extracting && (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 size={14} className="animate-spin" style={{ color: "hsl(var(--accent))" }} />
            <span className="text-xs" style={{ color: "hsl(var(--accent))", fontFamily: "'DM Sans'" }}>Extraindo campos com IA...</span>
          </div>
        )}
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
