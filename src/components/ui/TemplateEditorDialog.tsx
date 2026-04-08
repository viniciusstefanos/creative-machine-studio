import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Upload, Pencil } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: any; // null = create, object = edit
  clients?: any[];
  onSaved: () => void;
}

const CATEGORIES = [
  { value: "static", label: "Estático" },
  { value: "carousel", label: "Carrossel" },
];

const RATIOS = ["4:5", "9:16", "1:1"];
const GEN_TYPES = [
  { value: "html_only", label: "HTML only" },
  { value: "image_only", label: "Image only" },
  { value: "html_and_image", label: "HTML + Image" },
];
const VISIBILITIES = [
  { value: "global", label: "Global" },
  { value: "client_only", label: "Exclusivo do cliente" },
];

const dimensionsFor = (ratio: string) => {
  switch (ratio) {
    case "9:16": return { w: 1080, h: 1920 };
    case "1:1": return { w: 1080, h: 1080 };
    default: return { w: 1080, h: 1350 };
  }
};

export function TemplateEditorDialog({ open, onOpenChange, template, clients, onSaved }: Props) {
  const isEdit = !!template;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("static");
  const [aspectRatio, setAspectRatio] = useState("4:5");
  const [genType, setGenType] = useState("html_only");
  const [slidesMin, setSlidesMin] = useState(3);
  const [slidesMax, setSlidesMax] = useState(5);
  const [htmlScaffold, setHtmlScaffold] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [imagePromptTemplate, setImagePromptTemplate] = useState("");
  const [editableFieldsJson, setEditableFieldsJson] = useState("{}");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string | "">("");
  const [visibility, setVisibility] = useState("global");
  const [slug, setSlug] = useState("");

  // AI generation
  const [aiDescription, setAiDescription] = useState("");
  const [aiImageFile, setAiImageFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setCategory(template.category || "static");
      setAspectRatio(template.aspect_ratio || "4:5");
      setGenType(template.generation_type || "html_only");
      setSlidesMin(template.slides_count_min || 3);
      setSlidesMax(template.slides_count_max || 5);
      setHtmlScaffold(template.html_scaffold || "");
      setSystemPrompt(template.system_prompt || "");
      setImagePromptTemplate(template.image_prompt_template || "");
      setEditableFieldsJson(template.editable_fields ? JSON.stringify(template.editable_fields, null, 2) : "{}");
      setDescription(template.description || "");
      setClientId(template.client_id || "");
      setVisibility(template.visibility || "global");
      setSlug(template.slug || "");
    } else {
      setName(""); setCategory("static"); setAspectRatio("4:5"); setGenType("html_only");
      setSlidesMin(3); setSlidesMax(5); setHtmlScaffold(""); setSystemPrompt("");
      setImagePromptTemplate(""); setEditableFieldsJson("{}"); setDescription("");
      setClientId(""); setVisibility("global"); setSlug("");
    }
  }, [template, open]);

  const generateSlug = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleAiGenerate = async (mode: "from_description" | "from_image") => {
    setAiLoading(true);
    try {
      let imageUrl: string | undefined;

      if (mode === "from_image" && aiImageFile) {
        const ext = aiImageFile.name.split(".").pop() || "png";
        const path = `template-refs/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("assets").upload(path, aiImageFile);
        if (upErr) throw new Error("Upload falhou: " + upErr.message);
        const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: {
          mode,
          description: mode === "from_description" ? aiDescription : undefined,
          image_url: mode === "from_image" ? imageUrl : undefined,
          category,
          aspect_ratio: aspectRatio,
          generation_type: genType,
        },
      });

      if (error) throw error;

      if (data.html_scaffold) setHtmlScaffold(data.html_scaffold);
      if (data.system_prompt) setSystemPrompt(data.system_prompt);
      if (data.editable_fields) setEditableFieldsJson(JSON.stringify(data.editable_fields, null, 2));
      if (data.image_prompt_template) setImagePromptTemplate(data.image_prompt_template);

      toast({ title: "Template gerado!", description: "Revise e ajuste os campos gerados pela IA." });
    } catch (err: any) {
      toast({ title: "Erro na geração", description: err.message || "Falha ao gerar template", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }

    let parsedFields = {};
    try {
      parsedFields = JSON.parse(editableFieldsJson);
    } catch {
      toast({ title: "JSON inválido em Editable Fields", variant: "destructive" });
      return;
    }

    const dim = dimensionsFor(aspectRatio);
    const finalSlug = slug || generateSlug(name);

    const record: any = {
      name,
      slug: finalSlug,
      category,
      aspect_ratio: aspectRatio,
      generation_type: genType,
      width_px: dim.w,
      height_px: dim.h,
      slides_count_min: category === "carousel" ? slidesMin : 1,
      slides_count_max: category === "carousel" ? slidesMax : 1,
      html_scaffold: htmlScaffold || null,
      system_prompt: systemPrompt || null,
      image_prompt_template: imagePromptTemplate || null,
      editable_fields: parsedFields,
      description: description || null,
      client_id: clientId || null,
      visibility,
      is_base: false,
      active: true,
    };

    setSaving(true);

    if (isEdit) {
      const { error } = await supabase.from("asset_templates").update(record).eq("id", template.id);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("asset_templates").insert(record);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({ title: isEdit ? "Template atualizado" : "Template criado" });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const previewHtml = htmlScaffold
    ? `<div style="width:${dimensionsFor(aspectRatio).w}px;height:${dimensionsFor(aspectRatio).h}px;transform-origin:top left;transform:scale(0.15);overflow:hidden">${htmlScaffold}</div>`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[hsl(var(--bg-surface1))] border-[hsl(var(--border-subtle))]">
        <DialogHeader>
          <DialogTitle className="text-display-lg">{isEdit ? "Editar Template" : "Novo Template"}</DialogTitle>
          <DialogDescription className="text-caption">
            {isEdit ? "Edite os campos e salve." : "Crie manualmente ou use IA para gerar."}
          </DialogDescription>
        </DialogHeader>

        {/* AI Generation Section */}
        {!isEdit && (
          <div className="card-base mb-4 space-y-3">
            <p className="text-heading flex items-center gap-2"><Sparkles size={16} className="text-accent" /> Gerar com IA</p>

            {/* Basic config needed for AI */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-mono-label">Categoria</Label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="field-input mt-1">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-mono-label">Aspect Ratio</Label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="field-input mt-1">
                  {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-mono-label">Tipo geração</Label>
                <select value={genType} onChange={(e) => setGenType(e.target.value)} className="field-input mt-1">
                  {GEN_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>

            <Tabs defaultValue="description" className="w-full">
              <TabsList className="bg-[hsl(var(--bg-surface2))]">
                <TabsTrigger value="description" className="gap-1.5"><Pencil size={12} /> Descrição</TabsTrigger>
                <TabsTrigger value="image" className="gap-1.5"><Upload size={12} /> Imagem de referência</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="space-y-3 mt-3">
                <Textarea
                  placeholder="Ex: carrossel minimalista com fundo gradiente escuro, 5 slides, tipografia bold branca..."
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  rows={3}
                  className="bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]"
                />
                <Button
                  onClick={() => handleAiGenerate("from_description")}
                  disabled={aiLoading || !aiDescription.trim()}
                  className="gap-2"
                >
                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Gerar template
                </Button>
              </TabsContent>

              <TabsContent value="image" className="space-y-3 mt-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-md bg-[hsl(var(--bg-surface2))] border border-[hsl(var(--border-subtle))] cursor-pointer hover:border-[hsl(var(--accent))] transition-colors">
                    <Upload size={14} />
                    <span className="text-body-sm">{aiImageFile ? aiImageFile.name : "Selecionar imagem"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setAiImageFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <Button
                  onClick={() => handleAiGenerate("from_image")}
                  disabled={aiLoading || !aiImageFile}
                  className="gap-2"
                >
                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Extrair template da imagem
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Refine with AI (edit mode) */}
        {isEdit && (
          <div className="card-base mb-4 space-y-3">
            <p className="text-heading flex items-center gap-2"><Sparkles size={16} className="text-accent" /> Refinar com IA</p>
            <Textarea
              placeholder="Descreva as mudanças desejadas..."
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              rows={2}
              className="bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]"
            />
            <Button
              onClick={() => handleAiGenerate("from_description")}
              disabled={aiLoading || !aiDescription.trim()}
              size="sm"
              className="gap-2"
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Refinar
            </Button>
          </div>
        )}

        {/* Manual Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-mono-label">Nome *</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); if (!isEdit) setSlug(generateSlug(e.target.value)); }} className="mt-1 bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]" />
            </div>
            <div>
              <Label className="text-mono-label">Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]" />
            </div>
          </div>

          {isEdit && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-mono-label">Categoria</Label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="field-input mt-1">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-mono-label">Aspect Ratio</Label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="field-input mt-1">
                  {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-mono-label">Tipo geração</Label>
                <select value={genType} onChange={(e) => setGenType(e.target.value)} className="field-input mt-1">
                  {GEN_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {category === "carousel" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-mono-label">Slides mín.</Label>
                <Input type="number" value={slidesMin} onChange={(e) => setSlidesMin(Number(e.target.value))} min={1} max={20} className="mt-1 bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]" />
              </div>
              <div>
                <Label className="text-mono-label">Slides máx.</Label>
                <Input type="number" value={slidesMax} onChange={(e) => setSlidesMax(Number(e.target.value))} min={1} max={20} className="mt-1 bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-mono-label">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-mono-label">Visibilidade</Label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="field-input mt-1">
                {VISIBILITIES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-mono-label">Cliente (opcional)</Label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="field-input mt-1">
                <option value="">Nenhum</option>
                {(clients || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* HTML Scaffold with live preview */}
          <div>
            <Label className="text-mono-label">HTML Scaffold</Label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-1">
              <Textarea
                value={htmlScaffold}
                onChange={(e) => setHtmlScaffold(e.target.value)}
                rows={12}
                className="font-mono text-xs bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]"
                placeholder="<div style='...'> {{hook}} </div>"
              />
              {previewHtml && (
                <div className="border border-[hsl(var(--border-subtle))] rounded-md overflow-hidden bg-[hsl(var(--bg-surface2))]" style={{ height: 280 }}>
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><body style="margin:0;background:#111">${previewHtml}</body></html>`}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                    title="Preview"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-mono-label">System Prompt</Label>
            <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={4} className="mt-1 bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]" />
          </div>

          <div>
            <Label className="text-mono-label">Image Prompt Template</Label>
            <Textarea value={imagePromptTemplate} onChange={(e) => setImagePromptTemplate(e.target.value)} rows={3} className="mt-1 bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]" />
          </div>

          <div>
            <Label className="text-mono-label">Editable Fields (JSON)</Label>
            <Textarea
              value={editableFieldsJson}
              onChange={(e) => setEditableFieldsJson(e.target.value)}
              rows={6}
              className="mt-1 font-mono text-xs bg-[hsl(var(--bg-surface2))] border-[hsl(var(--border-subtle))]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Salvar" : "Criar Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
