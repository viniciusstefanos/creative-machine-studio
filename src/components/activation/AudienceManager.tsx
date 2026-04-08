import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users, Plus, Copy, Trash2, Loader2, RefreshCw, Globe, UserPlus
} from "lucide-react";

interface AudienceManagerProps {
  metaAccount: {
    ad_account_id: string | null;
    page_access_token: string | null;
    facebook_page_id?: string | null;
  } | null;
}

interface Audience {
  id: string;
  name: string;
  subtype: string;
  approximate_count: number;
  delivery_status?: { status: string };
  description?: string;
  time_created?: string;
}

const SUBTYPES: Record<string, string> = {
  CUSTOM: "Custom",
  WEBSITE: "Website",
  LOOKALIKE: "Lookalike",
  ENGAGEMENT: "Engajamento",
  IG_BUSINESS: "Instagram",
  VIDEO: "Vídeo",
  OFFLINE_CONVERSION: "Offline",
};

export const AudienceManager = ({ metaAccount }: AudienceManagerProps) => {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [lookalikeOpen, setLookalikeOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSubtype, setNewSubtype] = useState("CUSTOM");

  // Lookalike form
  const [lkName, setLkName] = useState("");
  const [lkCountry, setLkCountry] = useState("BR");
  const [lkRatio, setLkRatio] = useState("1");

  const fetchAudiences = async () => {
    if (!metaAccount?.ad_account_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "list_audiences",
          ad_account_id: metaAccount.ad_account_id,
          page_access_token: metaAccount.page_access_token,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setAudiences(data.audiences || []);
    } catch (err: any) {
      toast.error("Erro ao buscar audiências: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAudiences(); }, [metaAccount?.ad_account_id]);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Nome é obrigatório"); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "create_audience",
          ad_account_id: metaAccount?.ad_account_id,
          name: newName.trim(),
          description: newDescription.trim(),
          subtype: newSubtype,
          page_access_token: metaAccount?.page_access_token,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Audiência criada com sucesso");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      fetchAudiences();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    } finally {
      setCreating(false);
    }
  };

  const handleCreateLookalike = async () => {
    if (!lkName.trim() || !selectedOrigin) { toast.error("Nome e audiência origem são obrigatórios"); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "create_lookalike",
          ad_account_id: metaAccount?.ad_account_id,
          name: lkName.trim(),
          origin_audience_id: selectedOrigin,
          country: lkCountry,
          ratio: parseFloat(lkRatio) / 100,
          page_access_token: metaAccount?.page_access_token,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Lookalike criado com sucesso");
      setLookalikeOpen(false);
      setLkName("");
      setSelectedOrigin(null);
      fetchAudiences();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (audienceId: string) => {
    if (!confirm("Excluir esta audiência? Esta ação não pode ser desfeita.")) return;
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: {
          action: "delete_audience",
          audience_id: audienceId,
          page_access_token: metaAccount?.page_access_token,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Audiência excluída");
      fetchAudiences();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + (err.message || ""));
    }
  };

  if (!metaAccount?.ad_account_id) {
    return (
      <div className="p-6 rounded-lg text-center" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
        <Users size={28} className="mx-auto mb-2" style={{ color: "hsl(var(--text-muted))" }} />
        <p className="text-xs" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
          Configure a conta de anúncio Meta para gerenciar audiências.
        </p>
      </div>
    );
  }

  const customAudiences = audiences.filter(a => a.subtype !== "LOOKALIKE");
  const lookalikeAudiences = audiences.filter(a => a.subtype === "LOOKALIKE");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Audiências ({audiences.length})</SectionLabel>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] gap-1 h-7"
            style={{ color: "hsl(var(--text-muted))" }}
            onClick={fetchAudiences}
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs gap-1.5"
            style={{
              color: "hsl(var(--text-secondary))",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
              border: "1px solid hsl(var(--border-default))",
            }}
            onClick={() => { setSelectedOrigin(customAudiences[0]?.id || null); setLookalikeOpen(true); }}
            disabled={customAudiences.length === 0}
          >
            <Copy size={14} /> Criar Lookalike
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5"
            style={{
              background: "hsl(var(--accent))",
              color: "hsl(var(--accent-foreground))",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
            }}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} /> Nova Audiência
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin" style={{ color: "hsl(var(--accent))" }} />
        </div>
      ) : audiences.length === 0 ? (
        <div className="p-8 rounded-lg text-center" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}>
          <Users size={32} className="mx-auto mb-3" style={{ color: "hsl(var(--text-muted))" }} />
          <p className="text-sm mb-1" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>Nenhuma audiência encontrada</p>
          <p className="text-[10px]" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
            Crie audiências personalizadas e lookalikes para segmentar suas campanhas
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Custom audiences */}
          {customAudiences.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                Audiências personalizadas ({customAudiences.length})
              </p>
              <div className="space-y-2">
                {customAudiences.map(aud => (
                  <div
                    key={aud.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                        <UserPlus size={14} style={{ color: "hsl(var(--accent))" }} />
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                          {aud.name}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                            {SUBTYPES[aud.subtype] || aud.subtype}
                          </span>
                          {aud.approximate_count > 0 && (
                            <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                              ~{aud.approximate_count.toLocaleString("pt-BR")} pessoas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] gap-1 h-7"
                        style={{ color: "hsl(var(--accent))" }}
                        onClick={() => { setSelectedOrigin(aud.id); setLkName(`Lookalike — ${aud.name}`); setLookalikeOpen(true); }}
                      >
                        <Copy size={10} /> Lookalike
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        style={{ color: "hsl(var(--status-rejected))" }}
                        onClick={() => handleDelete(aud.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lookalike audiences */}
          {lookalikeAudiences.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                Lookalikes ({lookalikeAudiences.length})
              </p>
              <div className="space-y-2">
                {lookalikeAudiences.map(aud => (
                  <div
                    key={aud.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "hsl(210 80% 60% / 0.1)" }}>
                        <Globe size={14} style={{ color: "hsl(210 80% 60%)" }} />
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                          {aud.name}
                        </p>
                        {aud.approximate_count > 0 && (
                          <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                            ~{aud.approximate_count.toLocaleString("pt-BR")} pessoas
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      style={{ color: "hsl(var(--status-rejected))" }}
                      onClick={() => handleDelete(aud.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Audience Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))" }}>
          <DialogHeader>
            <DialogTitle className="text-sm" style={{ color: "hsl(var(--text-primary))", fontFamily: "'Syne'" }}>
              Nova Audiência Personalizada
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: "hsl(var(--text-muted))" }}>
              Crie uma audiência para segmentar suas campanhas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Nome</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Visitantes do site últimos 30 dias"
                className="mt-1"
                style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Descrição</Label>
              <Input
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Descrição opcional"
                className="mt-1"
                style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Tipo</Label>
              <div className="flex gap-2 mt-1">
                {["CUSTOM", "WEBSITE", "ENGAGEMENT"].map(s => (
                  <button
                    key={s}
                    onClick={() => setNewSubtype(s)}
                    className="px-3 py-1.5 rounded-md text-xs transition-all"
                    style={{
                      background: newSubtype === s ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                      border: `1px solid ${newSubtype === s ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                      color: newSubtype === s ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                      fontFamily: "'DM Sans'",
                      borderRadius: 6,
                    }}
                  >
                    {SUBTYPES[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)} className="text-xs">Cancelar</Button>
            <Button
              size="sm"
              className="text-xs gap-1.5"
              style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", fontFamily: "'DM Sans'", borderRadius: 6 }}
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar audiência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lookalike Dialog */}
      <Dialog open={lookalikeOpen} onOpenChange={setLookalikeOpen}>
        <DialogContent style={{ background: "hsl(var(--bg-surface1))", border: "1px solid hsl(var(--border-default))" }}>
          <DialogHeader>
            <DialogTitle className="text-sm" style={{ color: "hsl(var(--text-primary))", fontFamily: "'Syne'" }}>
              Criar Público Lookalike
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: "hsl(var(--text-muted))" }}>
              Encontre pessoas semelhantes à sua audiência existente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Nome</Label>
              <Input
                value={lkName}
                onChange={e => setLkName(e.target.value)}
                placeholder="Ex: LAL 1% — Compradores"
                className="mt-1"
                style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Audiência origem</Label>
              <div className="space-y-1.5 mt-1 max-h-[140px] overflow-y-auto">
                {customAudiences.map(aud => (
                  <button
                    key={aud.id}
                    onClick={() => setSelectedOrigin(aud.id)}
                    className="w-full text-left px-3 py-2 rounded-md text-xs transition-all"
                    style={{
                      background: selectedOrigin === aud.id ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                      border: `1px solid ${selectedOrigin === aud.id ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                      color: selectedOrigin === aud.id ? "hsl(var(--accent))" : "hsl(var(--text-secondary))",
                      fontFamily: "'DM Sans'",
                    }}
                  >
                    {aud.name}
                    {aud.approximate_count > 0 && (
                      <span className="ml-2 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                        ~{aud.approximate_count.toLocaleString("pt-BR")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>País</Label>
                <Input
                  value={lkCountry}
                  onChange={e => setLkCountry(e.target.value.toUpperCase())}
                  placeholder="BR"
                  className="mt-1"
                  maxLength={2}
                  style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}
                />
              </div>
              <div>
                <Label className="text-xs" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Tamanho (%)</Label>
                <div className="flex gap-1 mt-1">
                  {["1", "2", "3", "5", "10"].map(v => (
                    <button
                      key={v}
                      onClick={() => setLkRatio(v)}
                      className="flex-1 py-1.5 rounded text-xs transition-all"
                      style={{
                        background: lkRatio === v ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                        border: `1px solid ${lkRatio === v ? "hsl(var(--accent))" : "hsl(var(--border-default))"}`,
                        color: lkRatio === v ? "hsl(var(--accent))" : "hsl(var(--text-muted))",
                        fontFamily: "'JetBrains Mono', monospace",
                        borderRadius: 6,
                      }}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setLookalikeOpen(false)} className="text-xs">Cancelar</Button>
            <Button
              size="sm"
              className="text-xs gap-1.5"
              style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", fontFamily: "'DM Sans'", borderRadius: 6 }}
              onClick={handleCreateLookalike}
              disabled={creating || !lkName.trim() || !selectedOrigin}
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
              Criar Lookalike
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
