import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronRight, Loader2, Sparkles, Layout, Image, Layers, Eye, Pencil } from "lucide-react";

interface EditableField {
  label: string;
  type: "color" | "select" | "slider" | "text";
  default: string | number;
  options?: string[];
  min?: number;
  max?: number;
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "carousel": return <Layers size={28} className="text-txt-ghost" />;
    case "static": return <Image size={28} className="text-txt-ghost" />;
    default: return <Layout size={28} className="text-txt-ghost" />;
  }
};

/** Fill {{key}} placeholders in a template string */
const fillTemplate = (tpl: string, ctx: Record<string, any>): string =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] || "");

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

  // Image prompt review state
  const [imagePrompt, setImagePrompt] = useState("");
  const [brief, setBrief] = useState<any>(null);

  const templateUsesImage = selectedTemplate?.generation_type === "image_only" || selectedTemplate?.generation_type === "html_and_image";

  // Total steps: 5 if template uses image (includes prompt review), otherwise 4
  const totalSteps = templateUsesImage ? 5 : 4;
  const stepLabels = templateUsesImage
    ? ["Selecionar Copy", "Selecionar Template", "Configurar", "Prompt de Imagem", "Gerar"]
    : ["Selecionar Copy", "Selecionar Template", "Configurar", "Gerar"];

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [copiesRes, templatesRes, actRes, briefRes] = await Promise.all([
        supabase.from("copies").select("*").eq("activation_id", id).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.from("asset_templates").select("*").eq("active", true).order("category"),
        supabase.from("activations").select("*, clients(name)").eq("id", id).single(),
        supabase.from("briefs").select("*").eq("activation_id", id).maybeSingle(),
      ]);
      setCopies(copiesRes.data || []);
      setTemplates(templatesRes.data || []);
      if (actRes.data) {
        setActivation(actRes.data);
        setClientName((actRes.data as any).clients?.name || "");
      }
      setBrief(briefRes.data);
      setLoading(false);
    };
    fetchData();
  }, [id]);

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

  // Build image prompt when entering the prompt review step
  const buildImagePrompt = () => {
    if (!selectedTemplate || !selectedCopy) return "";
    const copy = copies.find((c) => c.id === selectedCopy);
    if (!copy) return "";
    const context: Record<string, any> = {
      hook: copy.hook || "",
      body: copy.body || "",
      cta: copy.cta || "",
      full_copy: copy.full_copy || `${copy.hook || ""}\n${copy.body || ""}\n${copy.cta || ""}`,
      objectives: brief?.objectives || "",
      target_audience: brief?.target_audience || "",
      tone_of_voice: brief?.tone_of_voice || "",
      ...renderConfig,
    };
    const tpl = selectedTemplate.image_prompt_template || "";
    return fillTemplate(tpl, context);
  };

  // When moving to prompt review step, pre-fill the prompt
  const goToPromptStep = () => {
    setImagePrompt(buildImagePrompt());
    setStep(4); // prompt review is always step 4 when image is used
  };

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
          use_claude: useClaude,
          ...(templateUsesImage && imagePrompt ? { custom_image_prompt: imagePrompt } : {}),
        },
      })
      .catch((err) => console.error("generate error:", err));

    navigate(`/activations/${id}/assets/${asset.id}`);
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <p className="text-body-sm">Carregando...</p>
      </AppLayout>
    );
  }

  const categories = [...new Set(templates.map((t) => t.category))];
  const filteredTemplates = categoryFilter
    ? templates.filter((t) => t.category === categoryFilter)
    : templates;

  // Determine which step content to show
  const confirmStep = totalSteps; // last step is always confirm
  const promptStep = templateUsesImage ? 4 : -1; // -1 = doesn't exist

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName, href: `/clients/${activation?.client_id}` },
        { label: activation?.name || "", href: `/activations/${id}/assets` },
        { label: "Nova Peça" },
      ]}
    >
      <h1 className="text-display-lg mb-6">Nova Peça Visual</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={14} className="text-txt-ghost" />}
              <button
                className="flex items-center gap-2"
                onClick={() => isDone && setStep(stepNum)}
                disabled={!isDone}
                style={{ cursor: isDone ? "pointer" : "default" }}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-mono ${
                    isDone
                      ? "bg-accent text-txt-inverse"
                      : isActive
                      ? "bg-accent-dim text-txt-inverse border border-accent"
                      : "bg-surface-2 text-txt-muted"
                  }`}
                >
                  {isDone ? <Check size={14} /> : stepNum}
                </div>
                <span className={`text-label ${isActive ? "text-txt-primary" : "text-txt-muted"}`}>
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
          <div className="section-label--ruled mb-4">
            <SectionLabel>Copies Aprovados</SectionLabel>
          </div>
          {copies.length === 0 ? (
            <div className="empty-state card-base">
              <p className="empty-state__title">Nenhum copy aprovado</p>
              <p className="empty-state__desc">Aprove um copy antes de criar uma peça.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {copies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCopy(c.id); setStep(2); }}
                  className={`card-base card-interactive text-left transition-all duration-100 ${
                    selectedCopy === c.id ? "!border-accent !bg-accent-surface" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-mono-label">{c.type} · {c.channel} · v{c.version}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-body line-clamp-2">{c.hook || c.body || "Sem conteúdo"}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Template */}
      {step === 2 && (
        <div>
          <div className="section-label--ruled mb-4">
            <SectionLabel>Templates Disponíveis</SectionLabel>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`text-mono px-3 py-1.5 rounded-md transition-all border ${
                !categoryFilter
                  ? "bg-accent-dim text-accent border-accent"
                  : "bg-surface-2 text-txt-muted border-line"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-mono px-3 py-1.5 rounded-md transition-all border ${
                  categoryFilter === cat
                    ? "bg-accent-dim text-accent border-accent"
                    : "bg-surface-2 text-txt-muted border-line"
                }`}
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
                className={`card-base card-interactive text-left transition-all duration-100 overflow-hidden ${
                  selectedTemplate?.id === t.id ? "!border-accent !bg-accent-surface" : ""
                }`}
                style={{ padding: 0 }}
              >
                <div
                  className="flex items-center justify-center bg-surface-2 border-b border-line-subtle"
                  style={{ maxHeight: 160, aspectRatio: t.aspect_ratio === "9:16" ? "9/16" : "1/1" }}
                >
                  {categoryIcon(t.category)}
                </div>
                <div className="p-3">
                  <p className="text-body font-medium mb-2">{t.name}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className={`text-mono px-1.5 py-0.5 rounded ${t.is_base ? "bg-surface-3 text-txt-muted" : "bg-accent-surface text-accent"}`}>
                      {t.is_base ? "BASE" : "CUSTOM"}
                    </span>
                    <span className="text-mono px-1.5 py-0.5 rounded bg-surface-3 text-txt-muted">{t.category}</span>
                    <span className="text-mono px-1.5 py-0.5 rounded bg-surface-3 text-txt-muted">{t.width_px}×{t.height_px}</span>
                  </div>
                  {t.description && (
                    <p className="text-caption mt-2 line-clamp-2">{t.description}</p>
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
          <div className="section-label--ruled mb-4">
            <SectionLabel>Configurar Template</SectionLabel>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-base">
              <p className="text-heading mb-1">{selectedTemplate.name}</p>
              <p className="text-caption mb-3">{selectedTemplate.description}</p>
              <div className="flex gap-4">
                <div>
                  <span className="text-mono-label">Dimensões</span>
                  <p className="text-mono-lg mt-1">{selectedTemplate.width_px}×{selectedTemplate.height_px}px</p>
                </div>
                <div>
                  <span className="text-mono-label">Tipo</span>
                  <p className="text-mono-lg mt-1">{selectedTemplate.generation_type.replace(/_/g, " ")}</p>
                </div>
                {selectedTemplate.category === "carousel" && (
                  <div>
                    <span className="text-mono-label">Slides</span>
                    <p className="text-mono-lg mt-1">{selectedTemplate.slides_count_min}–{selectedTemplate.slides_count_max}</p>
                  </div>
                )}
              </div>
            </div>
            {selectedTemplate.editable_fields && Object.keys(selectedTemplate.editable_fields).length > 0 && (
              <div className="card-base space-y-4">
                <span className="text-mono-label">Personalização</span>
                {Object.entries(selectedTemplate.editable_fields as Record<string, EditableField>).map(([key, field]) => (
                  <div key={key}>
                    <label className="field-label">{field.label}</label>
                    {field.type === "color" && (
                      <div className="flex items-center gap-2 field-input !p-1 !pr-3">
                        <input
                          type="color"
                          value={renderConfig[key] || field.default}
                          onChange={(e) => setRenderConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-8 h-8 rounded border-none cursor-pointer bg-transparent p-0"
                        />
                        <span className="text-mono">{renderConfig[key] || field.default}</span>
                      </div>
                    )}
                    {field.type === "select" && (
                      <select
                        value={renderConfig[key] || field.default}
                        onChange={(e) => setRenderConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="field-input"
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
                          className="flex-1 accent-accent"
                        />
                        <span className="text-mono w-8 text-right">{renderConfig[key] || field.default}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="ghost" onClick={() => setStep(2)}>← Voltar</Button>
            <Button onClick={() => templateUsesImage ? goToPromptStep() : setStep(4)}>
              Continuar <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 (conditional): Image Prompt Review */}
      {step === promptStep && templateUsesImage && (
        <div>
          <div className="section-label--ruled mb-4">
            <SectionLabel>Prompt de Imagem</SectionLabel>
          </div>
          <div className="card-base space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-heading mb-1">Validar prompt de geração</p>
                <p className="text-caption">
                  Este prompt será enviado à IA para gerar a imagem. Edite livremente antes de confirmar.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-txt-ghost" />
                <Pencil size={16} className="text-txt-ghost" />
              </div>
            </div>

            <div>
              <label className="field-label">Prompt base (do template)</label>
              <p className="text-caption mb-2 text-txt-ghost">
                {selectedTemplate?.image_prompt_template || "Sem template definido"}
              </p>
            </div>

            <div>
              <label className="field-label">Prompt preenchido (editável)</label>
              <Textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={8}
                className="bg-surface-1 border-line text-body font-mono text-sm"
                placeholder="Descreva a imagem que deseja gerar..."
              />
              <p className="text-caption mt-2">
                💡 A IA vai otimizar este prompt antes de gerar a imagem. Foque na intenção visual — contexto brasileiro, estética Instagram, autenticidade.
              </p>
            </div>

            <div className="card-base !bg-surface-2 !border-line-subtle">
              <p className="text-mono-label mb-2">Dicas para bons prompts</p>
              <ul className="text-caption space-y-1 list-disc list-inside">
                <li>Descreva o cenário e a pessoa (se houver) em contexto real brasileiro</li>
                <li>Prefira estilo UGC/autêntico em vez de estúdio polido</li>
                <li>Mencione iluminação (ex: "luz natural dourada", "tungsten warm")</li>
                <li>Indique enquadramento: close, meio corpo, plano aberto</li>
                <li>Use referências sensoriais: texturas, cores, atmosfera</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="ghost" onClick={() => setStep(3)}>← Voltar</Button>
            <Button onClick={() => setStep(confirmStep)}>
              Continuar <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Final Step: Confirm & Generate */}
      {step === confirmStep && (
        <div>
          <div className="section-label--ruled mb-4">
            <SectionLabel>Confirmar e Gerar</SectionLabel>
          </div>
          <div className="card-base">
            <div className="space-y-4">
              <div>
                <span className="text-mono-label">Copy selecionado</span>
                <p className="text-body mt-1 line-clamp-2">
                  {copies.find((c) => c.id === selectedCopy)?.hook || "—"}
                </p>
              </div>
              <div>
                <span className="text-mono-label">Template</span>
                <p className="text-body mt-1">
                  {selectedTemplate?.name} ({selectedTemplate?.width_px}×{selectedTemplate?.height_px}px)
                </p>
              </div>
              {templateUsesImage && imagePrompt && (
                <div>
                  <span className="text-mono-label">Prompt de imagem</span>
                  <p className="text-caption mt-1 line-clamp-3 font-mono">{imagePrompt}</p>
                </div>
              )}
              {Object.keys(renderConfig).length > 0 && (
                <div>
                  <span className="text-mono-label">Configurações</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(renderConfig).map(([key, val]) => (
                      <span key={key} className="text-mono px-2 py-1 rounded bg-surface-2 text-txt-secondary">
                        {key}: {String(val)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 items-center pt-4 border-t border-line-subtle">
              <Button variant="ghost" onClick={() => setStep(templateUsesImage ? promptStep : 3)}>← Voltar</Button>

              {/* Claude toggle */}
              <button
                onClick={() => setUseClaude(!useClaude)}
                className={`flex items-center gap-2 text-mono px-3 py-2 rounded-md transition-all border ${
                  useClaude
                    ? "bg-accent-dim text-accent border-accent"
                    : "bg-surface-2 text-txt-muted border-line"
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${useClaude ? "bg-accent" : "bg-line-strong"}`} />
                Claude (Anthropic)
              </button>

              <Button onClick={handleGenerate} disabled={generating} className="gap-2 ml-auto">
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
