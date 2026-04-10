import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface EditableField {
  label: string;
  type: "color" | "select" | "slider" | "text";
  default: string | number;
  options?: string[];
  min?: number;
  max?: number;
  locked?: boolean;
  from_brief?: string;
}

interface ConfigureTemplateProps {
  template: any;
  renderConfig: Record<string, any>;
  setRenderConfig: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  briefColorFields: Set<string>;
  onNext: () => void;
  onBack: () => void;
}

export const ConfigureTemplate = ({
  template,
  renderConfig,
  setRenderConfig,
  briefColorFields,
  onNext,
  onBack,
}: ConfigureTemplateProps) => (
  <div>
    <div className="section-label--ruled mb-4">
      <SectionLabel>Configurar Template</SectionLabel>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-base">
        <p className="text-heading mb-1">{template.name}</p>
        <p className="text-caption mb-3">{template.description}</p>
        <div className="flex gap-4">
          <div>
            <span className="text-mono-label">Dimensões</span>
            <p className="text-mono-lg mt-1">{template.width_px}×{template.height_px}px</p>
          </div>
          <div>
            <span className="text-mono-label">Tipo</span>
            <p className="text-mono-lg mt-1">{template.generation_type.replace(/_/g, " ")}</p>
          </div>
          {template.category === "carousel" && (
            <div>
              <span className="text-mono-label">Slides</span>
              <p className="text-mono-lg mt-1">{template.slides_count_min}–{template.slides_count_max}</p>
            </div>
          )}
        </div>
      </div>
      {template.editable_fields && Object.keys(template.editable_fields).length > 0 && (
        <div className="card-base space-y-4">
          <span className="text-mono-label">Personalização</span>
          {Object.entries(template.editable_fields as Record<string, EditableField>).map(([key, field]) => (
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
                  {briefColorFields.has(key) && (
                    <span className="text-mono px-1.5 py-0.5 rounded bg-accent-surface text-accent text-[10px]">
                      🎨 Do briefing
                    </span>
                  )}
                  {field.locked && (
                    <span className="text-mono px-1.5 py-0.5 rounded bg-surface-3 text-txt-ghost text-[10px]">
                      🔒 Fixo
                    </span>
                  )}
                </div>
              )}
              {field.type === "select" && (
                <select
                  value={renderConfig[key] || field.default}
                  onChange={(e) => setRenderConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="field-input"
                >
                  {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
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
      <Button variant="ghost" onClick={onBack}>← Voltar</Button>
      <Button onClick={onNext}>
        Continuar <ChevronRight size={14} className="ml-1" />
      </Button>
    </div>
  </div>
);
