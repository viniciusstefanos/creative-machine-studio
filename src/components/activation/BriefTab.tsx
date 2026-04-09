import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { BriefVisualIdentity } from "@/components/activation/BriefVisualIdentity";
import { BriefFilesSection } from "@/components/activation/BriefFilesSection";
import { BriefFileViewer } from "@/components/activation/BriefFileViewer";
import { SocialProfileSection } from "@/components/activation/SocialProfileSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

interface BriefTabProps {
  activationId: string;
}

export const BriefTab = ({ activationId }: BriefTabProps) => {
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
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
    system_prompt: "",
  });
  const [refInput, setRefInput] = useState("");
  const [extractedHighlight, setExtractedHighlight] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
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
          system_prompt: (data as any).system_prompt || "",
        });
      }
      if (filesRes.data) setBriefFiles(filesRes.data as any[]);
      setLoading(false);
    };
    fetchData();
  }, [activationId]);

  const handleSave = async () => {
    setSaving(true);
    if (brief) {
      await supabase.from("briefs").update({ ...form, updated_at: new Date().toISOString() } as any).eq("id", brief.id);
    } else {
      const { data } = await supabase.from("briefs").insert([{ activation_id: activationId, ...form } as any]).select().single();
      if (data) setBrief(data);
    }
    setSaving(false);
    toast({ title: "Brief salvo!" });
  };

  const handleConsolidate = async () => {
    const filesWithData = briefFiles.filter((f) => f.extracted_fields && Object.keys(f.extracted_fields).length > 0);
    if (filesWithData.length === 0) {
      toast({ title: "Nenhum arquivo com dados extraídos", description: "Faça upload e extração de arquivos primeiro.", variant: "destructive" });
      return;
    }

    setConsolidating(true);
    const newForm = { ...form };
    const highlights: Record<string, boolean> = {};

    for (const file of filesWithData) {
      const ef = file.extracted_fields;

      // Tone of voice
      const toneSummary = typeof ef.tone_of_voice === "object" ? ef.tone_of_voice?.summary : ef.tone_of_voice;
      if (toneSummary && !newForm.tone_of_voice) {
        newForm.tone_of_voice = toneSummary;
        highlights.tone_of_voice = true;
      }

      // Target audience
      const audienceSummary = typeof ef.target_audience === "object" ? ef.target_audience?.summary : ef.target_audience;
      if (audienceSummary && !newForm.target_audience) {
        newForm.target_audience = audienceSummary;
        highlights.target_audience = true;
      }

      // Objectives
      if (ef.objectives && !newForm.objectives) {
        newForm.objectives = ef.objectives;
        highlights.objectives = true;
      }

      // Extra context
      if (ef.extra_context && !newForm.extra_context) {
        newForm.extra_context = ef.extra_context;
        highlights.extra_context = true;
      }

      // Visual
      if (ef.visual_guidelines) {
        if (ef.visual_guidelines.colors_hex?.length && !newForm.brand_colors) {
          newForm.brand_colors = ef.visual_guidelines.colors_hex.join(", ");
          highlights.brand_colors = true;
        }
        if (ef.visual_guidelines.fonts?.length && !newForm.typography) {
          newForm.typography = ef.visual_guidelines.fonts.join(", ");
          highlights.typography = true;
        }
        if (ef.visual_guidelines.style && !newForm.visual_style) {
          newForm.visual_style = ef.visual_guidelines.style;
          highlights.visual_style = true;
        }
      }

      // References
      if (ef.references_urls?.length) {
        newForm.references_urls = [...new Set([...newForm.references_urls, ...ef.references_urls])];
        highlights.references_urls = true;
      }
    }

    // Build consolidated context from all deep fields
    const consolidated: any = {};
    for (const file of filesWithData) {
      const ef = file.extracted_fields;
      for (const key of ["brand_name", "brand_positioning", "brand_values", "products_services", "competitors", "proof_points", "key_messages", "restrictions"]) {
        if (ef[key]) {
          if (Array.isArray(ef[key]) && ef[key].length > 0) {
            consolidated[key] = [...(consolidated[key] || []), ...ef[key]];
          } else if (typeof ef[key] === "string" && ef[key].trim()) {
            consolidated[key] = consolidated[key] ? `${consolidated[key]}; ${ef[key]}` : ef[key];
          }
        }
      }
    }

    setForm(newForm);
    setExtractedHighlight(highlights);
    setConsolidating(false);

    // Save consolidated context
    if (brief) {
      await supabase.from("briefs").update({ consolidated_context: consolidated } as any).eq("id", brief.id);
    }

    toast({ title: "Dados consolidados dos arquivos!", description: `${Object.keys(highlights).length} campos preenchidos.` });
  };

  const handleExtracted = (ex: any) => {
    const highlights: Record<string, boolean> = {};
    const newForm = { ...form };

    const toneSummary = typeof ex.tone_of_voice === "object" ? ex.tone_of_voice?.summary : ex.tone_of_voice;
    if (toneSummary && !newForm.tone_of_voice) { newForm.tone_of_voice = toneSummary; highlights.tone_of_voice = true; }

    const audienceSummary = typeof ex.target_audience === "object" ? ex.target_audience?.summary : ex.target_audience;
    if (audienceSummary && !newForm.target_audience) { newForm.target_audience = audienceSummary; highlights.target_audience = true; }

    if (ex.objectives && !newForm.objectives) { newForm.objectives = ex.objectives; highlights.objectives = true; }
    if (ex.extra_context && !newForm.extra_context) { newForm.extra_context = ex.extra_context; highlights.extra_context = true; }
    if (ex.references_urls?.length) {
      newForm.references_urls = [...new Set([...newForm.references_urls, ...ex.references_urls])];
      highlights.references_urls = true;
    }

    setForm(newForm);
    setExtractedHighlight((prev) => ({ ...prev, ...highlights }));
  };

  const handleFileUpdate = (updated: any) => {
    setBriefFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };

  const handleAddRef = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && refInput.trim()) {
      e.preventDefault();
      setForm({ ...form, references_urls: [...form.references_urls, refInput.trim()] });
      setRefInput("");
    }
  };

  const getHighlightClass = (field: string) => {
    if (extractedHighlight[field] === true) return "field-input !border-[hsl(var(--accent))] shadow-[0_0_0_1px_hsl(var(--accent)/0.25)]";
    if (extractedHighlight[field] === false) return "field-input !border-[hsl(var(--status-review))] shadow-[0_0_0_1px_hsl(var(--status-review)/0.25)]";
    return "field-input";
  };

  if (loading) return <div className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>Carregando...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <SectionLabel>Brief da Ativação</SectionLabel>

      {/* ═══ DOCUMENTOS ═══ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="field-label">Documentos de referência</label>
          {briefFiles.length > 0 && (
            <button
              onClick={handleConsolidate}
              disabled={consolidating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all disabled:opacity-40"
              style={{
                background: "hsl(var(--bg-surface3))",
                color: "hsl(var(--accent))",
                border: "1px solid hsl(var(--accent) / 0.3)",
                borderRadius: 6,
                fontFamily: "'DM Sans'",
              }}
            >
              {consolidating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Consolidar dos arquivos
            </button>
          )}
        </div>

        {/* File viewers */}
        {briefFiles.length > 0 && (
          <div className="space-y-2 mb-3">
            {briefFiles.map((f) => (
              <BriefFileViewer key={f.id} file={f} onUpdate={handleFileUpdate} />
            ))}
          </div>
        )}

        {/* Upload zone */}
        <BriefFilesSection
          activationId={activationId}
          files={briefFiles}
          onFilesChange={setBriefFiles}
          onExtracted={handleExtracted}
        />
      </div>

      {/* ═══ CAMPOS EDITÁVEIS ═══ */}
      <div className="pt-4" style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
        <SectionLabel>Dados do Brief</SectionLabel>
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

      {/* Referências */}
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

      {/* ═══ PERFIL SOCIAL ═══ */}
      <SocialProfileSection activationId={activationId} />

      {/* System Prompt */}
      <div className="pt-6 mt-2" style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
        <label className="field-label">Instruções customizadas para IA</label>
        <p className="text-[10px] mb-2" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace" }}>
          Regras específicas desta ativação. Ex: "nunca usar a palavra promoção", "sempre mencionar delivery grátis".
        </p>
        <textarea
          value={form.system_prompt}
          onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
          rows={3}
          className="field-input field-textarea"
          placeholder="Instruções adicionais para a IA nesta ativação..."
        />
      </div>

      {/* Save */}
      <div className="flex justify-end gap-2 mt-6 pt-5" style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
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
