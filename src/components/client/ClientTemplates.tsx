import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TemplatePreview } from "@/components/ui/TemplatePreview";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateEditorDialog } from "@/components/ui/TemplateEditorDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ClientTemplates({ clientId }: { clientId: string }) {
  const [globalTemplates, setGlobalTemplates] = useState<any[]>([]);
  const [clientTemplates, setClientTemplates] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [tplRes, settingsRes] = await Promise.all([
      supabase.from("asset_templates").select("*").eq("active", true).order("name"),
      supabase.from("client_template_settings").select("*").eq("client_id", clientId),
    ]);

    const all = tplRes.data || [];
    setGlobalTemplates(all.filter((t: any) => t.visibility === "global" || !t.client_id));
    setClientTemplates(all.filter((t: any) => t.client_id === clientId));

    const map: Record<string, boolean> = {};
    (settingsRes.data || []).forEach((s: any) => { map[s.template_id] = s.enabled; });
    setSettings(map);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clientId]);

  const toggleTemplate = async (templateId: string, enabled: boolean) => {
    setSettings((prev) => ({ ...prev, [templateId]: enabled }));

    const existing = await supabase
      .from("client_template_settings")
      .select("id")
      .eq("client_id", clientId)
      .eq("template_id", templateId)
      .maybeSingle();

    if (existing.data) {
      await supabase.from("client_template_settings").update({ enabled }).eq("id", existing.data.id);
    } else {
      await supabase.from("client_template_settings").insert({ client_id: clientId, template_id: templateId, enabled });
    }
  };

  const isEnabled = (templateId: string) => settings[templateId] !== false; // default enabled

  if (loading) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Templates</SectionLabel>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditorOpen(true)}>
          <Plus size={14} /> Template exclusivo
        </Button>
      </div>

      {/* Client-exclusive templates */}
      {clientTemplates.length > 0 && (
        <div className="mb-4">
          <p className="text-mono-label mb-2">Exclusivos deste cliente</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clientTemplates.map((t) => (
              <div key={t.id} className="card-base overflow-hidden" style={{ padding: 0 }}>
                <div className="bg-[hsl(var(--bg-surface2))] border-b border-[hsl(var(--border-subtle))]">
                  <TemplatePreview template={t} />
                </div>
                <div className="p-3">
                  <p className="text-body font-medium">{t.name}</p>
                  <p className="text-mono-label mt-1">{t.category} · {t.width_px}×{t.height_px}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global templates toggle */}
      <p className="text-mono-label mb-2">Templates globais</p>
      <div className="space-y-2">
        {globalTemplates.map((t) => (
          <div key={t.id} className="card-base flex items-center gap-3">
            <Switch
              checked={isEnabled(t.id)}
              onCheckedChange={(v) => toggleTemplate(t.id, v)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium truncate">{t.name}</p>
              <p className="text-mono-label">{t.category} · {t.generation_type.replace(/_/g, " ")}</p>
            </div>
            <span className="text-mono px-1.5 py-0.5 rounded bg-[hsl(var(--bg-surface3))] text-[hsl(var(--text-muted))]">
              {t.width_px}×{t.height_px}
            </span>
          </div>
        ))}
      </div>

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        clients={[{ id: clientId, name: "Este cliente" }]}
        onSaved={fetchData}
      />
    </div>
  );
}
