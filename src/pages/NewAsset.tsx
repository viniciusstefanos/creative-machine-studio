import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronRight } from "lucide-react";
import { buildAssetName } from "@/lib/assetNaming";
import { useBriefColors } from "@/hooks/useBriefColors";

import { SelectCopy } from "@/components/new-asset/SelectCopy";
import { SelectTemplate } from "@/components/new-asset/SelectTemplate";
import { ConfigureTemplate } from "@/components/new-asset/ConfigureTemplate";
import { ReviewImagePrompt } from "@/components/new-asset/ReviewImagePrompt";
import { ConfirmGenerate } from "@/components/new-asset/ConfirmGenerate";

interface EditableField {
  label: string;
  type: "color" | "select" | "slider" | "text";
  default: string | number;
  options?: string[];
  locked?: boolean;
  from_brief?: string;
}

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
  const [useClaude, setUseClaude] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [brief, setBrief] = useState<any>(null);
  const [briefFiles, setBriefFiles] = useState<any[]>([]);
  const [briefColorFields, setBriefColorFields] = useState<Set<string>>(new Set());

  const briefColors = useBriefColors(brief, briefFiles);
  const templateUsesImage = selectedTemplate?.generation_type === "image_only" || selectedTemplate?.generation_type === "html_and_image";
  const totalSteps = templateUsesImage ? 5 : 4;
  const stepLabels = templateUsesImage
    ? ["Selecionar Copy", "Selecionar Template", "Configurar", "Prompt de Imagem", "Gerar"]
    : ["Selecionar Copy", "Selecionar Template", "Configurar", "Gerar"];

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [copiesRes, templatesRes, actRes, briefRes, settingsRes, briefFilesRes] = await Promise.all([
        supabase.from("copies").select("*").eq("activation_id", id).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.from("asset_templates").select("*").eq("active", true).order("category"),
        supabase.from("activations").select("*, clients(name, id)").eq("id", id).single(),
        supabase.from("briefs").select("*").eq("activation_id", id).maybeSingle(),
        supabase.from("client_template_settings").select("template_id, enabled"),
        supabase.from("brief_files").select("extracted_fields").eq("activation_id", id).not("extracted_fields", "is", null),
      ]);
      setCopies(copiesRes.data || []);

      const allTemplates = templatesRes.data || [];
      const clientId = (actRes.data as any)?.clients?.id || (actRes.data as any)?.client_id;
      const settings = settingsRes.data || [];
      const disabledIds = new Set(settings.filter((s: any) => !s.enabled).map((s: any) => s.template_id));
      const filtered = allTemplates.filter((t: any) => {
        if (t.visibility === "client_only" && t.client_id && t.client_id !== clientId) return false;
        if (t.visibility === "global" && disabledIds.has(t.id)) return false;
        return true;
      });
      setTemplates(filtered);
      if (actRes.data) {
        setActivation(actRes.data);
        setClientName((actRes.data as any).clients?.name || "");
      }
      setBrief(briefRes.data);
      setBriefFiles(briefFilesRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Auto-fill editable fields from brief colors
  useEffect(() => {
    if (!selectedTemplate?.editable_fields) {
      setRenderConfig({});
      setBriefColorFields(new Set());
      return;
    }
    const defaults: Record<string, any> = {};
    const fields = selectedTemplate.editable_fields as Record<string, EditableField>;
    const filledFromBrief = new Set<string>();

    const fromBriefMap: Record<string, string | undefined> = {
      background: briefColors.primary,
      accent: briefColors.accent,
      text: briefColors.text || "#f5f5f0",
      primary: briefColors.primary,
      secondary: briefColors.secondary,
    };
    const legacyColorMap: Record<string, string | undefined> = {
      brand_color: briefColors.primary,
      accent_color: briefColors.accent,
      cta_color: briefColors.accent || briefColors.primary,
      primary_color: briefColors.primary,
      secondary_color: briefColors.secondary,
      bg_color: briefColors.primary,
      text_color: briefColors.text || "#f5f5f0",
    };

    Object.entries(fields).forEach(([key, field]) => {
      defaults[key] = field.default;
      if (field.type === "color" && !field.locked) {
        const briefValue = field.from_brief ? fromBriefMap[field.from_brief] : legacyColorMap[key];
        if (briefValue) {
          defaults[key] = briefValue;
          filledFromBrief.add(key);
        }
      }
    });
    setRenderConfig(defaults);
    setBriefColorFields(filledFromBrief);
  }, [selectedTemplate, briefColors]);

  const buildImagePromptText = () => {
    if (!selectedTemplate || !selectedCopy) return "";
    const copy = copies.find((c) => c.id === selectedCopy);
    if (!copy) return "";
    const context: Record<string, any> = {
      hook: copy.hook || "", body: copy.body || "", cta: copy.cta || "",
      full_copy: copy.full_copy || `${copy.hook || ""}\n${copy.body || ""}\n${copy.cta || ""}`,
      objectives: brief?.objectives || "", target_audience: brief?.target_audience || "",
      tone_of_voice: brief?.tone_of_voice || "", ...renderConfig,
    };
    return fillTemplate(selectedTemplate.image_prompt_template || "", context);
  };

  const goToPromptStep = () => {
    setImagePrompt(buildImagePromptText());
    setStep(4);
  };

  const handleGenerate = async () => {
    if (!selectedCopy || !selectedTemplate || !id) return;
    setGenerating(true);

    const { count: existingCount } = await supabase
      .from("assets").select("id", { count: "exact", head: true }).eq("activation_id", id);
    const seq = (existingCount || 0) + 1;
    const copy = copies.find((c) => c.id === selectedCopy);
    const assetName = buildAssetName(seq, selectedTemplate.category, copy?.hook);

    const { data: asset, error: insertError } = await supabase
      .from("assets")
      .insert({
        activation_id: id, copy_id: selectedCopy, template_id: selectedTemplate.id,
        status: "generating", category: selectedTemplate.category, render_config: renderConfig, name: assetName,
      })
      .select().single();

    if (insertError || !asset) {
      toast({ title: "Erro", description: "Falha ao criar peça", variant: "destructive" });
      setGenerating(false);
      return;
    }

    supabase.functions
      .invoke("generate-asset-from-template", {
        body: {
          asset_id: asset.id, activation_id: id, copy_id: selectedCopy,
          template_id: selectedTemplate.id, render_config: renderConfig, use_claude: useClaude,
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

  const confirmStep = totalSteps;
  const promptStep = templateUsesImage ? 4 : -1;

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
              {i > 0 && <ChevronRight size={14} className="text-txt-ghost hidden sm:block" />}
              <button
                className="flex items-center gap-2"
                onClick={() => isDone && setStep(stepNum)}
                disabled={!isDone}
                style={{ cursor: isDone ? "pointer" : "default" }}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-mono flex-shrink-0 ${
                  isDone ? "bg-accent text-txt-inverse" : isActive ? "bg-accent-dim text-txt-inverse border border-accent" : "bg-surface-2 text-txt-muted"
                }`}>
                  {isDone ? <Check size={14} /> : stepNum}
                </div>
                <span className={`text-label hidden sm:inline ${isActive ? "text-txt-primary" : "text-txt-muted"}`}>{label}</span>
              </button>
            </div>
          );
        })}
        <span className="text-mono sm:hidden ml-auto">{step} / {totalSteps}</span>
      </div>

      {step === 1 && (
        <SelectCopy copies={copies} selectedCopy={selectedCopy} onSelect={(id) => { setSelectedCopy(id); setStep(2); }} />
      )}

      {step === 2 && (
        <SelectTemplate templates={templates} selectedTemplate={selectedTemplate} onSelect={(t) => { setSelectedTemplate(t); setStep(3); }} onBack={() => setStep(1)} />
      )}

      {step === 3 && selectedTemplate && (
        <ConfigureTemplate
          template={selectedTemplate}
          renderConfig={renderConfig}
          setRenderConfig={setRenderConfig}
          briefColorFields={briefColorFields}
          onNext={() => templateUsesImage ? goToPromptStep() : setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === promptStep && templateUsesImage && (
        <ReviewImagePrompt
          template={selectedTemplate}
          imagePrompt={imagePrompt}
          setImagePrompt={setImagePrompt}
          onNext={() => setStep(confirmStep)}
          onBack={() => setStep(3)}
        />
      )}

      {step === confirmStep && (
        <ConfirmGenerate
          copies={copies}
          selectedCopy={selectedCopy}
          selectedTemplate={selectedTemplate}
          renderConfig={renderConfig}
          imagePrompt={imagePrompt}
          templateUsesImage={templateUsesImage}
          useClaude={useClaude}
          setUseClaude={setUseClaude}
          generating={generating}
          onGenerate={handleGenerate}
          onBack={() => setStep(templateUsesImage ? promptStep : 3)}
        />
      )}
    </AppLayout>
  );
};

export default NewAsset;
