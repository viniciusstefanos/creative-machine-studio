import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { TemplatePreview } from "@/components/ui/TemplatePreview";

const categoryLabel = (cat: string) => {
  switch (cat) {
    case "static": return "Estático";
    case "carousel": return "Carrossel";
    default: return "Vídeo";
  }
};

const SettingsTemplates = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    const { data } = await supabase.from("asset_templates").select("*").order("category").order("name");
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const toggleActive = async (tpl: any) => {
    const { error } = await supabase.from("asset_templates").update({ active: !tpl.active }).eq("id", tpl.id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao atualizar", variant: "destructive" });
    } else {
      fetchTemplates();
    }
  };

  const deleteTemplate = async (tpl: any) => {
    if (tpl.is_base) return;
    const { error } = await supabase.from("asset_templates").delete().eq("id", tpl.id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao excluir", variant: "destructive" });
    } else {
      fetchTemplates();
    }
  };

  const categories = [...new Set(templates.map((t) => t.category))];

  return (
    <AppLayout breadcrumbs={[{ label: "Configurações" }, { label: "Templates" }]}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display-lg">Templates de Peças</h1>
        <Button size="sm" className="gap-2" disabled>
          <Plus size={14} /> Novo template
        </Button>
      </div>

      {loading ? (
        <p className="text-body-sm">Carregando...</p>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="mb-8">
            <div className="section-label--ruled mb-3">
              <SectionLabel>{categoryLabel(cat)}</SectionLabel>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates
                .filter((t) => t.category === cat)
                .map((t) => (
                  <div
                    key={t.id}
                    className={`card-base card-interactive ${t.active ? "" : "opacity-50"}`}
                    style={{ padding: 0, overflow: "hidden" }}
                  >
                    {/* Wireframe preview */}
                    <div className="bg-[hsl(var(--bg-surface2))] border-b border-[hsl(var(--border-subtle))]">
                      <TemplatePreview template={t} />
                    </div>

                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-body flex-1 font-medium">{t.name}</p>
                        <span className={`text-mono px-1.5 py-0.5 rounded flex-shrink-0 ${t.is_base ? "bg-[hsl(var(--bg-surface3))] text-[hsl(var(--text-muted))]" : "bg-[hsl(var(--accent-surface))] text-[hsl(var(--accent))]"}`}>
                          {t.is_base ? "BASE" : "CUSTOM"}
                        </span>
                      </div>

                      <div className="flex gap-1 mb-2">
                        <span className="text-mono px-1.5 py-0.5 rounded bg-[hsl(var(--bg-surface3))] text-[hsl(var(--text-muted))]">
                          {t.generation_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-mono px-1.5 py-0.5 rounded bg-[hsl(var(--bg-surface3))] text-[hsl(var(--text-muted))]">
                          {t.width_px}×{t.height_px}
                        </span>
                      </div>

                      {t.description && (
                        <p className="text-caption line-clamp-2 mb-3">{t.description}</p>
                      )}

                      {!t.is_base && (
                        <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border-subtle))]">
                          <button
                            onClick={() => toggleActive(t)}
                            className="p-1.5 rounded-md bg-[hsl(var(--bg-surface2))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-secondary))] transition-colors"
                            title={t.active ? "Desativar" : "Ativar"}
                          >
                            {t.active ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => deleteTemplate(t)}
                            className="p-1.5 rounded-md bg-[hsl(var(--bg-surface2))] text-[hsl(var(--status-rejected))] hover:opacity-80 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </AppLayout>
  );
};

export default SettingsTemplates;
