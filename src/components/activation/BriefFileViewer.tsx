import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Tag, Loader2, RefreshCw, Package, Target, Palette, MessageSquare, Shield, Award, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const FILE_CATEGORIES = [
  { value: "identidade_visual", label: "Identidade Visual" },
  { value: "produto", label: "Produto" },
  { value: "tom_de_voz", label: "Tom de Voz" },
  { value: "publico_alvo", label: "Público-alvo" },
  { value: "contexto", label: "Contexto / Mercado" },
  { value: "referencias", label: "Referências" },
  { value: "briefing", label: "Briefing Geral" },
  { value: "geral", label: "Outro" },
];

const getCategoryColor = (value: string) => {
  const map: Record<string, string> = {
    identidade_visual: "hsl(var(--accent))",
    produto: "hsl(270 60% 60%)",
    tom_de_voz: "hsl(200 70% 55%)",
    publico_alvo: "hsl(330 60% 55%)",
    contexto: "hsl(40 70% 55%)",
    referencias: "hsl(160 50% 50%)",
    briefing: "hsl(var(--accent))",
    geral: "hsl(var(--text-muted))",
  };
  return map[value] || "hsl(var(--text-muted))";
};

const getCategoryLabel = (value: string) =>
  FILE_CATEGORIES.find((c) => c.value === value)?.label || value;

interface BriefFile {
  id: string;
  file_name: string;
  file_path: string;
  category: string;
  raw_text?: string | null;
  extracted_fields?: any;
  created_at: string;
}

interface BriefFileViewerProps {
  file: BriefFile;
  onUpdate: (updated: BriefFile) => void;
}

const FIELD_ICONS: Record<string, any> = {
  products_services: Package,
  target_audience: Target,
  visual_guidelines: Palette,
  tone_of_voice: MessageSquare,
  restrictions: Shield,
  proof_points: Award,
  competitors: AlertTriangle,
};

function ExtractedFieldCard({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div
      className="p-3 rounded-lg space-y-1.5"
      style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} style={{ color: "hsl(var(--accent))" }} />}
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'JetBrains Mono', monospace" }}>
          {label}
        </span>
      </div>
      <div className="text-xs" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
        {children}
      </div>
    </div>
  );
}

function renderValue(val: any): React.ReactNode {
  if (!val) return <span style={{ color: "hsl(var(--text-muted))" }}>—</span>;
  if (typeof val === "string") return <p className="whitespace-pre-wrap">{val}</p>;
  if (Array.isArray(val)) {
    if (val.length === 0) return <span style={{ color: "hsl(var(--text-muted))" }}>—</span>;
    if (typeof val[0] === "string") {
      return (
        <div className="flex flex-wrap gap-1.5">
          {val.map((v, i) => (
            <span key={i} className="px-2 py-0.5 rounded text-[10px]" style={{ background: "hsl(var(--bg-surface3))", color: "hsl(var(--text-secondary))", fontFamily: "'JetBrains Mono', monospace" }}>
              {v}
            </span>
          ))}
        </div>
      );
    }
    // Array of objects (products, competitors)
    return (
      <div className="space-y-2">
        {val.map((item, i) => (
          <div key={i} className="p-2 rounded" style={{ background: "hsl(var(--bg-surface3))", borderRadius: 6 }}>
            {Object.entries(item).map(([k, v]) => v ? (
              <div key={k} className="flex gap-2">
                <span className="text-[10px] font-medium shrink-0 w-20" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono'" }}>{k}:</span>
                <span className="text-[11px]" style={{ color: "hsl(var(--text-primary))" }}>{String(v)}</span>
              </div>
            ) : null)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof val === "object") {
    return (
      <div className="space-y-1">
        {Object.entries(val).map(([k, v]) => v && (typeof v === "string" || (Array.isArray(v) && v.length > 0)) ? (
          <div key={k}>
            <span className="text-[10px] font-medium" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono'" }}>{k}: </span>
            {renderValue(v)}
          </div>
        ) : null)}
      </div>
    );
  }
  return <span>{String(val)}</span>;
}

const FIELD_LABELS: Record<string, string> = {
  brand_name: "Nome da Marca",
  brand_positioning: "Posicionamento",
  brand_values: "Valores da Marca",
  products_services: "Produtos / Serviços",
  tone_of_voice: "Tom de Voz",
  target_audience: "Público-alvo",
  competitors: "Concorrentes",
  visual_guidelines: "Diretrizes Visuais",
  proof_points: "Provas / Dados Reais",
  key_messages: "Mensagens-chave",
  restrictions: "Restrições",
  objectives: "Objetivos",
  extra_context: "Contexto Extra",
  references_urls: "URLs de Referência",
  document_summary: "Resumo do Documento",
};

export const BriefFileViewer = ({ file, onUpdate }: BriefFileViewerProps) => {
  const [open, setOpen] = useState(false);
  const [reExtracting, setReExtracting] = useState(false);
  const color = getCategoryColor(file.category);
  const ef = file.extracted_fields || {};

  const handleReExtract = async () => {
    setReExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-brief", {
        body: { file_path: file.file_path },
      });
      if (error) throw error;

      const detectedCategory = data?.extracted?.detected_category;
      const updatePayload: any = {
        raw_text: data?.raw_text || null,
        extracted_fields: data?.extracted || null,
      };
      if (detectedCategory) updatePayload.category = detectedCategory;

      await supabase
        .from("brief_files" as any)
        .update(updatePayload)
        .eq("id", file.id);

      onUpdate({
        ...file,
        raw_text: data?.raw_text,
        extracted_fields: data?.extracted,
        ...(detectedCategory ? { category: detectedCategory } : {}),
      });

      toast({ title: "Arquivo re-extraído com sucesso" });
    } catch (err) {
      console.error("Re-extract error:", err);
      toast({ title: "Erro na re-extração", variant: "destructive" });
    }
    setReExtracting(false);
  };

  const extractedKeys = Object.keys(ef).filter(
    (k) => k !== "detected_category" && ef[k] && (typeof ef[k] !== "object" || (Array.isArray(ef[k]) ? ef[k].length > 0 : Object.values(ef[k]).some(Boolean)))
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div
          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all group hover:brightness-110"
          style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}
        >
          {open ? <ChevronDown size={14} style={{ color: "hsl(var(--text-muted))" }} /> : <ChevronRight size={14} style={{ color: "hsl(var(--text-muted))" }} />}
          <FileText size={16} style={{ color, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>{file.file_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: `${color}15`, color, fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Tag size={8} />
                {getCategoryLabel(file.category)}
              </span>
              {extractedKeys.length > 0 && (
                <span className="text-[10px]" style={{ color: "hsl(var(--status-approved))", fontFamily: "'JetBrains Mono'" }}>
                  {extractedKeys.length} campos extraídos
                </span>
              )}
            </div>
          </div>
          {reExtracting ? (
            <Loader2 size={14} className="animate-spin" style={{ color: "hsl(var(--accent))" }} />
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleReExtract(); }}
              className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "hsl(var(--text-muted))" }}
              title="Re-extrair com novo schema"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
          <Tabs defaultValue={extractedKeys.length > 0 ? "fields" : "text"}>
            <TabsList className="w-full justify-start rounded-none h-8" style={{ background: "hsl(var(--bg-surface1))", borderBottom: "1px solid hsl(var(--border-default))" }}>
              <TabsTrigger value="fields" className="text-[11px] h-7 data-[state=active]:bg-transparent" style={{ fontFamily: "'JetBrains Mono'" }}>
                Campos extraídos ({extractedKeys.length})
              </TabsTrigger>
              <TabsTrigger value="text" className="text-[11px] h-7 data-[state=active]:bg-transparent" style={{ fontFamily: "'JetBrains Mono'" }}>
                Texto completo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fields" className="m-0">
              <ScrollArea className="max-h-[400px]">
                <div className="p-3 space-y-2">
                  {extractedKeys.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: "hsl(var(--text-muted))" }}>
                      Nenhum campo extraído. Clique em re-extrair para processar com o novo schema.
                    </p>
                  ) : (
                    extractedKeys.map((key) => (
                      <ExtractedFieldCard
                        key={key}
                        label={FIELD_LABELS[key] || key}
                        icon={FIELD_ICONS[key]}
                      >
                        {renderValue(ef[key])}
                      </ExtractedFieldCard>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="text" className="m-0">
              <ScrollArea className="max-h-[400px]">
                <div className="p-3">
                  {file.raw_text ? (
                    <pre
                      className="text-[11px] whitespace-pre-wrap leading-relaxed"
                      style={{ color: "hsl(var(--text-secondary))", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {file.raw_text}
                    </pre>
                  ) : (
                    <p className="text-xs py-4 text-center" style={{ color: "hsl(var(--text-muted))" }}>
                      Sem texto extraído.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
