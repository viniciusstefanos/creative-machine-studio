import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Eye, EyeOff, Trash2, Pencil, Copy } from "lucide-react";
import { TemplatePreview } from "@/components/ui/TemplatePreview";
import { TemplateEditorDialog } from "@/components/ui/TemplateEditorDialog";

const categoryLabel = (cat: string) => {
  switch (cat) {
    case "static": return "Estático";
    case "carousel": return "Carrossel";
    case "story": return "Story";
    case "reels": return "Reels";
    default: return "Vídeo";
  }
};

const funnelLabel = (stage: string | null) => {
  switch (stage) {
    case "top": return "Topo";
    case "middle": return "Meio";
    case "bottom": return "Fundo";
    default: return null;
  }
};

const funnelColor = (stage: string | null) => {
  switch (stage) {
    case "top": return "bg-[hsl(var(--accent-surface))] text-[hsl(var(--accent))]";
    case "middle": return "bg-[hsl(var(--bg-surface3))] text-[hsl(var(--status-review))]";
    case "bottom": return "bg-[hsl(var(--bg-surface3))] text-[hsl(var(--status-approved))]";
    default: return "";
  }
};

const SettingsTemplates = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [filterFunnel, setFilterFunnel] = useState<string | "">("");
  const [showInactive, setShowInactive] = useState(false);

  const fetchData = async () => {
    const [tplRes, clientsRes] = await Promise.all([
      supabase.from("asset_templates").select("*").order("category").order("name"),
      supabase.from("clients").select("id, name").order("name"),
    ]);
    setTemplates(tplRes.data || []);
    setClients(clientsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleActive = async (tpl: any) => {
    const { error } = await supabase.from("asset_templates").update({ active: !tpl.active }).eq("id", tpl.id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao atualizar", variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const deleteTemplate = async (tpl: any) => {
    if (tpl.is_base) return;
    const { error } = await supabase.from("asset_templates").delete().eq("id", tpl.id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao excluir", variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const duplicateTemplate = async (tpl: any) => {
    const { id, created_at, ...rest } = tpl;
    const newRecord = {
      ...rest,
      name: `${tpl.name} (cópia)`,
      slug: `${tpl.slug}-copy-${Date.now()}`,
      is_base: false,
      visibility: "global",
    };
    const { error } = await supabase.from("asset_templates").insert(newRecord);
    if (error) {
      toast({ title: "Erro", description: "Falha ao duplicar", variant: "destructive" });
    } else {
      toast({ title: "Template duplicado" });
      fetchData();
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const openEdit = (tpl: any) => {
    setEditingTemplate(tpl);
    setEditorOpen(true);
  };

  const afterActive = showInactive ? templates : templates.filter((t) => t.active);
  const filtered = filterFunnel
    ? afterActive.filter((t) => t.funnel_stage === filterFunnel)
    : afterActive;

  const categories = [...new Set(filtered.map((t) => t.category))];

  return (
    <AppLayout breadcrumbs={[{ label: "Configurações" }, { label: "Templates" }]}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display-lg">Templates de Peças</h1>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus size={14} /> Novo template
        </Button>
      </div>

      {/* Funnel filter */}
      <div className="flex gap-2 mb-6">
        {["", "top", "middle", "bottom"].map((f) => (
          <button
            key={f}
            onClick={() => setFilterFunnel(f)}
            className={`px-3 py-1.5 rounded-md text-mono text-xs transition-colors ${
              filterFunnel === f
                ? "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]"
                : "bg-[hsl(var(--bg-surface2))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-secondary))]"
            }`}
          >
            {f === "" ? "Todos" : funnelLabel(f)}
          </button>
        ))}
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
              {filtered
                .filter((t) => t.category === cat)
                .map((t) => (
                  <div
                    key={t.id}
                    className={`card-base card-interactive ${t.active ? "" : "opacity-50"}`}
                    style={{ padding: 0, overflow: "hidden" }}
                  >
                    <div className="bg-[hsl(var(--bg-surface2))] border-b border-[hsl(var(--border-subtle))]">
                      <TemplatePreview template={t} />
                    </div>

                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-body flex-1 font-medium">{t.name}</p>
                        <span className={`text-mono px-1.5 py-0.5 rounded flex-shrink-0 ${t.is_base ? "bg-[hsl(var(--bg-surface3))] text-[hsl(var(--text-muted))]" : "bg-[hsl(var(--accent-surface))] text-[hsl(var(--accent))]"}`}>
                          {t.is_base ? "BASE" : "CUSTOM"}
                        </span>
                        {t.visibility === "client_only" && (
                          <span className="text-mono px-1.5 py-0.5 rounded bg-[hsl(var(--bg-surface3))] text-[hsl(var(--status-review))]">
                            EXCLUSIVO
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1 mb-2 flex-wrap">
                        <span className="text-mono px-1.5 py-0.5 rounded bg-[hsl(var(--bg-surface3))] text-[hsl(var(--text-muted))]">
                          {t.generation_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-mono px-1.5 py-0.5 rounded bg-[hsl(var(--bg-surface3))] text-[hsl(var(--text-muted))]">
                          {t.width_px}×{t.height_px}
                        </span>
                        {t.funnel_stage && funnelLabel(t.funnel_stage) && (
                          <span className={`text-mono px-1.5 py-0.5 rounded ${funnelColor(t.funnel_stage)}`}>
                            {funnelLabel(t.funnel_stage)}
                          </span>
                        )}
                      </div>

                      {t.description && (
                        <p className="text-caption line-clamp-2 mb-3">{t.description}</p>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border-subtle))]">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 rounded-md bg-[hsl(var(--bg-surface2))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => duplicateTemplate(t)}
                          className="p-1.5 rounded-md bg-[hsl(var(--bg-surface2))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] transition-colors"
                          title="Duplicar"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => toggleActive(t)}
                          className="p-1.5 rounded-md bg-[hsl(var(--bg-surface2))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-secondary))] transition-colors"
                          title={t.active ? "Desativar" : "Ativar"}
                        >
                          {t.active ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {!t.is_base && (
                          <button
                            onClick={() => deleteTemplate(t)}
                            className="p-1.5 rounded-md bg-[hsl(var(--bg-surface2))] text-[hsl(var(--status-rejected))] hover:opacity-80 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        clients={clients}
        onSaved={fetchData}
      />
    </AppLayout>
  );
};

export default SettingsTemplates;
