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

      {/* Global templates — compact summary + popover */}
      {globalTemplates.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-mono-label">
            {globalTemplates.filter((t) => isEnabled(t.id)).length} de {globalTemplates.length} templates globais ativos
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                <Settings2 size={14} /> Gerenciar
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="p-3 border-b border-[hsl(var(--border-subtle))]">
                <p className="text-body font-medium text-sm">Templates globais</p>
              </div>
              <ScrollArea className="max-h-64">
                <div className="p-2 space-y-1">
                  {globalTemplates.map((t) => (
                    <label key={t.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[hsl(var(--bg-surface2))] cursor-pointer transition-colors">
                      <Switch
                        checked={isEnabled(t.id)}
                        onCheckedChange={(v) => toggleTemplate(t.id, v)}
                        className="scale-[0.8]"
                      />
                      <span className="flex-1 min-w-0 text-body text-sm truncate">{t.name}</span>
                      <span className="text-mono text-[10px] text-[hsl(var(--text-muted))] shrink-0">
                        {t.width_px}×{t.height_px}
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        clients={[{ id: clientId, name: "Este cliente" }]}
        onSaved={fetchData}
      />
    </div>
  );
}
