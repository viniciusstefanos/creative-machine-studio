import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Eye, EyeOff, Trash2 } from "lucide-react";

/* ── Mini wireframe preview for each template ── */
const TemplatePreview = ({ template }: { template: any }) => {
  const is916 = template.aspect_ratio === "9:16";
  const isCarousel = template.category === "carousel";
  const hasImage = template.generation_type?.includes("image");

  // Proportional aspect ratio inside 120px tall container
  const containerH = 120;
  const containerW = is916 ? Math.round(containerH * (9 / 16)) : Math.round(containerH * (4 / 5));

  const bleedPct = is916 ? "13%" : "10%"; // visual representation of safe zones

  if (isCarousel) {
    // Show 3 mini cards side by side
    const cardW = Math.round((containerW - 8) / 1.2);
    return (
      <div className="flex items-center justify-center gap-1" style={{ height: containerH }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center border border-[hsl(var(--border-subtle))] rounded"
            style={{
              width: cardW,
              height: containerH - 16,
              background: i === 0
                ? "linear-gradient(135deg, hsl(var(--accent) / 0.15), hsl(var(--bg-surface3)))"
                : "hsl(var(--bg-surface3))",
              padding: "6px 4px",
              opacity: i === 2 ? 0.5 : 1,
            }}
          >
            {i === 0 ? (
              <>
                <div className="w-full h-1.5 rounded-full bg-[hsl(var(--accent)/0.6)] mb-1" />
                <div className="w-3/4 h-1 rounded-full bg-[hsl(var(--text-muted)/0.3)]" />
                <div className="text-[7px] mt-auto" style={{ color: "hsl(var(--accent))", fontFamily: "JetBrains Mono" }}>
                  HOOK
                </div>
              </>
            ) : i === 1 ? (
              <>
                <div className="w-full h-1 rounded-full bg-[hsl(var(--text-muted)/0.3)] mb-0.5" />
                <div className="w-full h-1 rounded-full bg-[hsl(var(--text-muted)/0.2)] mb-0.5" />
                <div className="w-2/3 h-1 rounded-full bg-[hsl(var(--text-muted)/0.2)]" />
              </>
            ) : (
              <>
                <div className="w-3/4 h-2 rounded bg-[hsl(var(--accent)/0.4)] mt-auto" />
                <div className="text-[7px] mt-1" style={{ color: "hsl(var(--text-muted))", fontFamily: "JetBrains Mono" }}>
                  CTA
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Single post preview
  return (
    <div className="flex items-center justify-center" style={{ height: containerH }}>
      <div
        className="relative flex flex-col items-center justify-center border border-[hsl(var(--border-subtle))] rounded overflow-hidden"
        style={{
          width: containerW,
          height: containerH - 8,
          background: hasImage
            ? "linear-gradient(180deg, hsl(var(--bg-surface3)), hsl(var(--bg-surface2)))"
            : "linear-gradient(135deg, hsl(var(--accent)/0.1), hsl(var(--bg-surface3)))",
        }}
      >
        {/* Top bleed zone */}
        <div
          className="absolute top-0 left-0 right-0 border-b border-dashed border-[hsl(var(--status-review)/0.3)]"
          style={{ height: bleedPct }}
        />
        {/* Bottom bleed zone */}
        <div
          className="absolute bottom-0 left-0 right-0 border-t border-dashed border-[hsl(var(--status-review)/0.3)]"
          style={{ height: bleedPct }}
        />

        {/* Content wireframe */}
        <div className="flex flex-col items-center gap-1 px-2" style={{ zIndex: 1 }}>
          {hasImage && (
            <div className="w-4 h-4 rounded bg-[hsl(var(--text-muted)/0.15)] mb-0.5 flex items-center justify-center">
              <span className="text-[6px]" style={{ color: "hsl(var(--text-muted))" }}>IMG</span>
            </div>
          )}
          <div className="w-full h-1.5 rounded-full bg-[hsl(var(--accent)/0.5)]" />
          <div className="w-3/4 h-1 rounded-full bg-[hsl(var(--text-muted)/0.3)]" />
          <div className="w-1/2 h-1 rounded-full bg-[hsl(var(--text-muted)/0.2)]" />
          <div className="w-2/3 h-1.5 rounded bg-[hsl(var(--accent)/0.3)] mt-1" />
        </div>

        {/* Ratio label */}
        <div
          className="absolute bottom-1 right-1 text-[7px]"
          style={{ color: "hsl(var(--text-ghost))", fontFamily: "JetBrains Mono" }}
        >
          {template.aspect_ratio}
        </div>
      </div>
    </div>
  );
};

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
