import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Save, RotateCcw, FileCode2, Sparkles } from "lucide-react";

interface PromptTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  content: string;
  is_system: boolean;
  updated_at: string;
}

const CATEGORY_ORDER = ["briefing", "copy", "peças", "templates"];
const CATEGORY_LABELS: Record<string, string> = {
  briefing: "Briefing",
  copy: "Copies",
  peças: "Peças",
  templates: "Templates",
};
const CATEGORY_ICONS: Record<string, typeof FileCode2> = {
  briefing: FileCode2,
  copy: FileCode2,
  peças: Sparkles,
  templates: FileCode2,
};

export default function SettingsPrompts() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [originalContents, setOriginalContents] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    const { data, error } = await supabase
      .from("prompt_templates")
      .select("*")
      .order("category")
      .order("name");
    if (error) {
      toast.error("Erro ao carregar prompts");
      console.error(error);
      return;
    }
    setPrompts((data as any[]) || []);
    const originals: Record<string, string> = {};
    for (const p of (data as any[]) || []) {
      originals[p.id] = p.content;
    }
    setOriginalContents(originals);
    setEditedContents({});
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || cat,
    prompts: prompts.filter(p => p.category === cat),
  })).filter(g => g.prompts.length > 0);

  const handleSave = async (prompt: PromptTemplate) => {
    const newContent = editedContents[prompt.id];
    if (newContent === undefined || newContent === originalContents[prompt.id]) return;
    setSaving(s => ({ ...s, [prompt.id]: true }));
    const { error } = await supabase
      .from("prompt_templates")
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq("id", prompt.id);
    setSaving(s => ({ ...s, [prompt.id]: false }));
    if (error) {
      toast.error("Erro ao salvar prompt");
      console.error(error);
    } else {
      toast.success(`"${prompt.name}" salvo com sucesso`);
      setOriginalContents(o => ({ ...o, [prompt.id]: newContent }));
      setEditedContents(e => { const n = { ...e }; delete n[prompt.id]; return n; });
    }
  };

  const handleRestore = (prompt: PromptTemplate) => {
    setEditedContents(e => { const n = { ...e }; delete n[prompt.id]; return n; });
  };

  const isEdited = (id: string) => editedContents[id] !== undefined && editedContents[id] !== originalContents[id];

  const currentContent = (prompt: PromptTemplate) => editedContents[prompt.id] ?? originalContents[prompt.id] ?? prompt.content;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-2xl font-bold tracking-tight mb-1"
            style={{ fontFamily: "'Syne', sans-serif", color: "hsl(var(--text-primary))" }}
          >
            Engenharia de Prompts
          </h1>
          <p className="text-sm" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans', sans-serif" }}>
            Edite os prompts de IA usados em cada etapa do fluxo criativo. As alterações entram em vigor imediatamente.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: "hsl(var(--bg-surface2))" }} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => {
              const Icon = CATEGORY_ICONS[group.category] || FileCode2;
              const isOpen = openCategories[group.category] !== false;
              return (
                <Collapsible
                  key={group.category}
                  open={isOpen}
                  onOpenChange={open => setOpenCategories(o => ({ ...o, [group.category]: open }))}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:opacity-80"
                      style={{ background: "hsl(var(--bg-surface2))" }}
                    >
                      <Icon size={18} style={{ color: "hsl(var(--accent))" }} />
                      <span className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: "hsl(var(--text-primary))" }}>
                        {group.label}
                      </span>
                      <Badge variant="secondary" className="ml-1 text-[10px]">{group.prompts.length}</Badge>
                      <span className="ml-auto" style={{ color: "hsl(var(--text-muted))" }}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2 ml-2">
                      {group.prompts.map(prompt => {
                        const expanded = expandedPrompt === prompt.id;
                        const edited = isEdited(prompt.id);
                        return (
                          <div
                            key={prompt.id}
                            className="rounded-lg border"
                            style={{
                              background: "hsl(var(--bg-surface1))",
                              borderColor: edited ? "hsl(var(--accent))" : "hsl(var(--border-subtle))",
                            }}
                          >
                            <button
                              className="w-full flex items-center gap-3 px-4 py-3 text-left"
                              onClick={() => setExpandedPrompt(expanded ? null : prompt.id)}
                            >
                              <span className="text-sm font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                                {prompt.name}
                              </span>
                              {edited && (
                                <Badge className="text-[9px] px-1.5 py-0" style={{ background: "hsl(var(--accent))", color: "#0a0a0a" }}>
                                  Editado
                                </Badge>
                              )}
                              {prompt.slug === "brief_extraction_schema" && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">JSON</Badge>
                              )}
                              <span className="ml-auto" style={{ color: "hsl(var(--text-muted))" }}>
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                            </button>

                            {expanded && (
                              <div className="px-4 pb-4 space-y-3">
                                {prompt.description && (
                                  <p className="text-xs" style={{ color: "hsl(var(--text-muted))" }}>
                                    {prompt.description}
                                  </p>
                                )}
                                <Textarea
                                  value={currentContent(prompt)}
                                  onChange={e => setEditedContents(ec => ({ ...ec, [prompt.id]: e.target.value }))}
                                  className="min-h-[300px] font-mono text-xs"
                                  style={{
                                    background: "hsl(var(--bg-base))",
                                    color: "hsl(var(--text-primary))",
                                    borderColor: "hsl(var(--border-subtle))",
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}
                                />
                                <div className="flex items-center gap-2 justify-end">
                                  <span className="text-[10px] mr-auto" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono'" }}>
                                    slug: {prompt.slug}
                                  </span>
                                  {edited && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRestore(prompt)}
                                      className="gap-1.5 text-xs"
                                    >
                                      <RotateCcw size={14} /> Restaurar
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    disabled={!edited || saving[prompt.id]}
                                    onClick={() => handleSave(prompt)}
                                    className="gap-1.5 text-xs"
                                  >
                                    <Save size={14} /> {saving[prompt.id] ? "Salvando..." : "Salvar"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
