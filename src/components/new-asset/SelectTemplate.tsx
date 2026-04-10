import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { TemplatePreview } from "@/components/ui/TemplatePreview";

interface SelectTemplateProps {
  templates: any[];
  selectedTemplate: any | null;
  onSelect: (template: any) => void;
  onBack: () => void;
}

export const SelectTemplate = ({ templates, selectedTemplate, onSelect, onBack }: SelectTemplateProps) => {
  const categories = [...new Set(templates.map((t) => t.category))];
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const filteredTemplates = categoryFilter ? templates.filter((t) => t.category === categoryFilter) : templates;

  return (
    <div>
      <div className="section-label--ruled mb-4">
        <SectionLabel>Templates Disponíveis</SectionLabel>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`text-mono px-3 py-1.5 rounded-md transition-all border ${
            !categoryFilter ? "bg-accent-dim text-accent border-accent" : "bg-surface-2 text-txt-muted border-line"
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`text-mono px-3 py-1.5 rounded-md transition-all border ${
              categoryFilter === cat ? "bg-accent-dim text-accent border-accent" : "bg-surface-2 text-txt-muted border-line"
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
            onClick={() => onSelect(t)}
            className={`card-base card-interactive text-left transition-all duration-100 overflow-hidden ${
              selectedTemplate?.id === t.id ? "!border-accent !bg-accent-surface" : ""
            }`}
            style={{ padding: 0 }}
          >
            <div className="bg-surface-2 border-b border-line-subtle flex items-center justify-center" style={{ minHeight: 120 }}>
              <TemplatePreview template={t} />
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
              {t.description && <p className="text-caption mt-2 line-clamp-2">{t.description}</p>}
            </div>
          </button>
        ))}
      </div>
      <Button variant="ghost" className="mt-4" onClick={onBack}>← Voltar</Button>
    </div>
  );
};

import { useState } from "react";
