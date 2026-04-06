import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Eye, EyeOff, Trash2 } from "lucide-react";

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
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
          Templates de Peças
        </h1>
        <Button size="sm" className="gap-2" disabled>
          <Plus size={14} /> Novo template
        </Button>
      </div>

      {loading ? (
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</div>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="mb-8">
            <SectionLabel>{cat === "static" ? "Estático" : cat === "carousel" ? "Carrossel" : "Vídeo"}</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {templates
                .filter((t) => t.category === cat)
                .map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg overflow-hidden transition-all"
                    style={{
                      background: "var(--bg-surface1)",
                      border: "1px solid var(--border-default)",
                      borderRadius: 8,
                      opacity: t.active ? 1 : 0.5,
                    }}
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{ height: 100, background: "var(--bg-surface2)", borderBottom: "1px solid var(--border-subtle)", fontSize: 28, color: "var(--text-ghost)" }}
                    >
                      {t.category === "carousel" ? "🎠" : t.generation_type === "image_only" ? "🖼️" : "📐"}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-medium flex-1" style={{ fontFamily: "'DM Sans'", color: "var(--text-primary)" }}>
                          {t.name}
                        </p>
                        <span
                          className="text-[9px] uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            background: t.is_base ? "var(--bg-surface3)" : "var(--accent-dim)",
                            color: t.is_base ? "var(--text-muted)" : "var(--accent)",
                          }}
                        >
                          {t.is_base ? "BASE" : "CUSTOM"}
                        </span>
                      </div>
                      <div className="flex gap-1 mb-2">
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded" style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--bg-surface3)", color: "var(--text-muted)" }}>
                          {t.generation_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded" style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--bg-surface3)", color: "var(--text-muted)" }}>
                          {t.width_px}×{t.height_px}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs line-clamp-2 mb-3" style={{ fontFamily: "'DM Sans'", color: "var(--text-ghost)" }}>
                          {t.description}
                        </p>
                      )}
                      {!t.is_base && (
                        <div className="flex gap-2">
                          <button onClick={() => toggleActive(t)} className="p-1.5 rounded transition-all" style={{ color: "var(--text-muted)", background: "var(--bg-surface2)", borderRadius: 6 }} title={t.active ? "Desativar" : "Ativar"}>
                            {t.active ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button onClick={() => deleteTemplate(t)} className="p-1.5 rounded transition-all" style={{ color: "var(--status-rejected)", background: "var(--bg-surface2)", borderRadius: 6 }} title="Excluir">
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
