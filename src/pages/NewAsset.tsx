import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronRight, Loader2, Sparkles } from "lucide-react";

interface EditableField {
  label: string;
  type: "color" | "select" | "slider" | "text";
  default: string | number;
  options?: string[];
  min?: number;
  max?: number;
}

const NewAsset = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [copies, setCopies] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedCopy, setSelectedCopy] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [renderConfig, setRenderConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activation, setActivation] = useState<any>(null);
  const [clientName, setClientName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [useClaude, setUseClaude] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [copiesRes, templatesRes, actRes] = await Promise.all([
        supabase.from("copies").select("*").eq("activation_id", id).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.from("asset_templates").select("*").eq("active", true).order("category"),
        supabase.from("activations").select("*, clients(name)").eq("id", id).single(),
      ]);
      setCopies(copiesRes.data || []);
      setTemplates(templatesRes.data || []);
      if (actRes.data) {
        setActivation(actRes.data);
        setClientName((actRes.data as any).clients?.name || "");
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Initialize render config when template is selected
  useEffect(() => {
    if (!selectedTemplate?.editable_fields) {
      setRenderConfig({});
      return;
    }
    const defaults: Record<string, any> = {};
    const fields = selectedTemplate.editable_fields as Record<string, EditableField>;
    Object.entries(fields).forEach(([key, field]) => {
      defaults[key] = field.default;
    });
    setRenderConfig(defaults);
  }, [selectedTemplate]);

  const handleGenerate = async () => {
    if (!selectedCopy || !selectedTemplate || !id) return;
    setGenerating(true);

    const { data: asset, error: insertError } = await supabase
      .from("assets")
      .insert({
        activation_id: id,
        copy_id: selectedCopy,
        template_id: selectedTemplate.id,
        status: "generating",
        category: selectedTemplate.category,
        render_config: renderConfig,
      })
      .select()
      .single();

    if (insertError || !asset) {
      toast({ title: "Erro", description: "Falha ao criar peça", variant: "destructive" });
      setGenerating(false);
      return;
    }

    supabase.functions
      .invoke("generate-asset-from-template", {
        body: {
          asset_id: asset.id,
          activation_id: id,
          copy_id: selectedCopy,
          template_id: selectedTemplate.id,
          render_config: renderConfig,
        },
      })
      .catch((err) => console.error("generate error:", err));

    navigate(`/activations/${id}/assets/${asset.id}`);
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>Carregando...</div>
      </AppLayout>
    );
  }

  const stepLabels = ["Selecionar Copy", "Selecionar Template", "Configurar", "Gerar"];
  const categories = [...new Set(templates.map((t) => t.category))];
  const filteredTemplates = categoryFilter
    ? templates.filter((t) => t.category === categoryFilter)
    : templates;

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName, href: `/clients/${activation?.client_id}` },
        { label: activation?.name || "", href: `/activations/${id}/assets` },
        { label: "Nova Peça" },
      ]}
    >
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
        Nova Peça Visual
      </h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={14} style={{ color: "var(--text-ghost)" }} />}
              <button
                className="flex items-center gap-2"
                onClick={() => isDone && setStep(stepNum)}
                disabled={!isDone}
                style={{ cursor: isDone ? "pointer" : "default" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    background: isDone ? "var(--accent)" : isActive ? "var(--accent-dim)" : "var(--bg-surface2)",
                    color: isDone || isActive ? "var(--bg-base)" : "var(--text-muted)",
                    border: isActive ? "1px solid var(--accent)" : "1px solid transparent",
                  }}
                >
                  {isDone ? <Check size={14} /> : stepNum}
                </div>
                <span
                  className="text-xs"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step 1: Select Copy */}
      {step === 1 && (
        <div>
          <SectionLabel>Copies Aprovados</SectionLabel>
          {copies.length === 0 ? (
            <div className="p-8 rounded-lg text-center mt-4" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>
                Nenhum copy aprovado. Aprove um copy antes de criar uma peça.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 mt-4">
              {copies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCopy(c.id); setStep(2); }}
                  className="p-4 rounded-lg text-left transition-all duration-150"
                  style={{
                    background: selectedCopy === c.id ? "var(--accent-surface)" : "var(--bg-surface1)",
                    border: selectedCopy === c.id ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                    borderRadius: 8,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                      {c.type} · {c.channel} · v{c.version}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-sm line-clamp-2" style={{ fontFamily: "'DM Sans'", color: "var(--text-primary)" }}>
                    {c.hook || c.body || "Sem conteúdo"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Template */}
      {step === 2 && (
        <div>
          <SectionLabel>Templates Disponíveis</SectionLabel>

          {/* Category filters */}
          <div className="flex gap-2 mt-4 mb-4">
            <button
              onClick={() => setCategoryFilter(null)}
              className="px-3 py-1.5 rounded text-xs transition-all"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: !categoryFilter ? "var(--accent-dim)" : "var(--bg-surface2)",
                color: !categoryFilter ? "var(--accent)" : "var(--text-muted)",
                border: !categoryFilter ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                borderRadius: 6,
              }}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="px-3 py-1.5 rounded text-xs transition-all"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: categoryFilter === cat ? "var(--accent-dim)" : "var(--bg-surface2)",
                  color: categoryFilter === cat ? "var(--accent)" : "var(--text-muted)",
                  border: categoryFilter === cat ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                  borderRadius: 6,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTemplate(t); setStep(3); }}
                className="rounded-lg text-left transition-all duration-150 overflow-hidden"
                style={{
                  background: selectedTemplate?.id === t.id ? "var(--accent-surface)" : "var(--bg-surface1)",
                  border: selectedTemplate?.id === t.id ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                  borderRadius: 8,
                }}
              >
                {/* Thumbnail placeholder */}
                <div
                  className="flex items-center justify-center"
                  style={{
                    aspectRatio: t.aspect_ratio === "9:16" ? "9/16" : "1/1",
                    maxHeight: 160,
                    background: "var(--bg-surface2)",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 32,
                    color: "var(--text-ghost)",
                  }}
                >
                  {t.category === "carousel" ? "🎠" : t.generation_type === "image_only" ? "🖼️" : "📐"}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium mb-2" style={{ fontFamily: "'DM Sans'", color: "var(--text-primary)" }}>
                    {t.name}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span
                      className="text-[9px] uppercase px-1.5 py-0.5 rounded"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        background: t.is_base ? "var(--bg-surface3)" : "var(--accent-dim)",
                        color: t.is_base ? "var(--text-muted)" : "var(--accent)",
                        border: t.is_base ? "none" : "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                      }}
                    >
                      {t.is_base ? "BASE" : "CUSTOM"}
                    </span>
                    <span
                      className="text-[9px] uppercase px-1.5 py-0.5 rounded"
                      style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--bg-surface3)", color: "var(--text-muted)" }}
                    >
                      {t.category}
                    </span>
                    <span
                      className="text-[9px] uppercase px-1.5 py-0.5 rounded"
                      style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--bg-surface3)", color: "var(--text-muted)" }}
                    >
                      {t.width_px}×{t.height_px}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ fontFamily: "'DM Sans'", color: "var(--text-ghost)" }}>
                      {t.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <Button variant="ghost" className="mt-4" onClick={() => setStep(1)}>← Voltar</Button>
        </div>
      )}

      {/* Step 3: Configure editable fields */}
      {step === 3 && selectedTemplate && (
        <div>
          <SectionLabel>Configurar Template</SectionLabel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Template info */}
            <div className="p-4 rounded-lg" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
              <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'DM Sans'", color: "var(--text-primary)" }}>
                {selectedTemplate.name}
              </p>
              <p className="text-xs mb-3" style={{ fontFamily: "'DM Sans'", color: "var(--text-ghost)" }}>
                {selectedTemplate.description}
              </p>
              <div className="flex gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>Dimensões</span>
                  <p className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
                    {selectedTemplate.width_px}×{selectedTemplate.height_px}px
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>Tipo</span>
                  <p className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
                    {selectedTemplate.generation_type.replace(/_/g, " ")}
                  </p>
                </div>
                {selectedTemplate.category === "carousel" && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>Slides</span>
                    <p className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
                      {selectedTemplate.slides_count_min}–{selectedTemplate.slides_count_max}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Editable fields */}
            {selectedTemplate.editable_fields && Object.keys(selectedTemplate.editable_fields).length > 0 && (
              <div className="p-4 rounded-lg space-y-4" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
                <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                  Personalização
                </span>
                {Object.entries(selectedTemplate.editable_fields as Record<string, EditableField>).map(([key, field]) => (
                  <div key={key}>
                    <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                      {field.label}
                    </label>
                    {field.type === "color" && (
                      <div className="flex items-center gap-2 p-1 pr-3 rounded" style={{ background: "var(--bg-base)", border: "1px solid var(--border-strong)", borderRadius: 6 }}>
                        <input
                          type="color"
                          value={renderConfig[key] || field.default}
                          onChange={(e) => setRenderConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-8 h-8 rounded border-none cursor-pointer"
                          style={{ background: "none", padding: 0 }}
                        />
                        <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
                          {renderConfig[key] || field.default}
                        </span>
                      </div>
                    )}
                    {field.type === "select" && (
                      <select
                        value={renderConfig[key] || field.default}
                        onChange={(e) => setRenderConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded text-sm"
                        style={{
                          fontFamily: "'DM Sans'",
                          background: "var(--bg-base)",
                          border: "1px solid var(--border-strong)",
                          color: "var(--text-primary)",
                          borderRadius: 6,
                        }}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    {field.type === "slider" && (
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={field.min || 0}
                          max={field.max || 100}
                          value={renderConfig[key] || field.default}
                          onChange={(e) => setRenderConfig((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="flex-1"
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span className="text-xs w-8 text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
                          {renderConfig[key] || field.default}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="ghost" onClick={() => setStep(2)}>← Voltar</Button>
            <Button onClick={() => setStep(4)}>
              Continuar <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm & Generate */}
      {step === 4 && (
        <div>
          <SectionLabel>Confirmar e Gerar</SectionLabel>
          <div className="mt-4 p-6 rounded-lg" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                  Copy selecionado
                </span>
                <p className="text-sm mt-1 line-clamp-2" style={{ fontFamily: "'DM Sans'", color: "var(--text-primary)" }}>
                  {copies.find((c) => c.id === selectedCopy)?.hook || "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                  Template
                </span>
                <p className="text-sm mt-1" style={{ fontFamily: "'DM Sans'", color: "var(--text-primary)" }}>
                  {selectedTemplate?.name} ({selectedTemplate?.width_px}×{selectedTemplate?.height_px}px)
                </p>
              </div>
              {Object.keys(renderConfig).length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                    Configurações
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(renderConfig).map(([key, val]) => (
                      <span key={key} className="text-xs px-2 py-1 rounded" style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--bg-surface2)", color: "var(--text-secondary)", borderRadius: 4 }}>
                        {key}: {String(val)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setStep(3)}>← Voltar</Button>
              <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? "Gerando..." : "Gerar peça com IA"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default NewAsset;
