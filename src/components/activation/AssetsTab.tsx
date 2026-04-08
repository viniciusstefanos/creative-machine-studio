import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  Image,
  Plus,
  Layers,
  LayoutGrid,
  LayoutList,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AssetsTabProps {
  activationId: string;
  copiesApproved?: number;
}

export const AssetsTab = ({ activationId, copiesApproved }: AssetsTabProps) => {
  const isMobile = useIsMobile();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("assets")
      .select("*, asset_formats(name, category)")
      .eq("activation_id", activationId)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setAssets([]);
      setLoading(false);
      return;
    }

    // Fetch first render thumbnail for each asset
    const assetIds = data.map(a => a.id);
    const { data: renders } = await supabase
      .from("asset_template_renders")
      .select("asset_id, png_url, slide_index")
      .in("asset_id", assetIds)
      .order("slide_index", { ascending: true });

    const thumbMap: Record<string, string> = {};
    if (renders) {
      for (const r of renders) {
        if (r.png_url && !thumbMap[r.asset_id]) {
          thumbMap[r.asset_id] = r.png_url;
        }
      }
    }

    const enriched = data.map(a => ({
      ...a,
      thumb_url: a.image_url || thumbMap[a.id] || null,
    }));

    setAssets(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, [activationId]);

  const allSelected = assets.length > 0 && selected.size === assets.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assets.map((a) => a.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const confirm = window.confirm(
      `Excluir ${selected.size} peça(s) permanentemente?`
    );
    if (!confirm) return;
    setDeleting(true);
    try {
      // Delete renders first
      const ids = Array.from(selected);
      await supabase
        .from("asset_template_renders")
        .delete()
        .in("asset_id", ids);
      const { error } = await supabase.from("assets").delete().in("id", ids);
      if (error) throw error;
      toast({ title: `${ids.length} peça(s) excluída(s)` });
      setSelected(new Set());
      fetchAssets();
    } catch (e: any) {
      toast({
        title: "Erro ao excluir",
        description: e.message,
        variant: "destructive",
      });
    }
    setDeleting(false);
  };

  const startEditName = (asset: any) => {
    setEditingName(asset.id);
    setNameValue(asset.name || asset.category || "");
  };

  const saveName = async (id: string) => {
    setSavingName(true);
    const { error } = await supabase
      .from("assets")
      .update({ name: nameValue } as any)
      .eq("id", id);
    if (error) {
      toast({
        title: "Erro ao renomear",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name: nameValue } : a))
      );
      toast({ title: "Nome atualizado" });
    }
    setEditingName(null);
    setSavingName(false);
  };

  const getDisplayName = (asset: any) => {
    return (
      asset.name ||
      asset.category ||
      `Peça v${asset.version}`
    );
  };

  if (loading)
    return <div className="text-caption">Carregando...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Peças Visuais</SectionLabel>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex rounded-md overflow-hidden"
            style={{
              border: "1px solid hsl(var(--border-subtle))",
            }}
          >
            <button
              onClick={() => setViewMode("list")}
              className="p-1.5 transition-colors"
              style={{
                background:
                  viewMode === "list"
                    ? "hsl(var(--surface-3))"
                    : "transparent",
                color:
                  viewMode === "list"
                    ? "hsl(var(--text-primary))"
                    : "hsl(var(--text-muted))",
              }}
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className="p-1.5 transition-colors"
              style={{
                background:
                  viewMode === "grid"
                    ? "hsl(var(--surface-3))"
                    : "transparent",
                color:
                  viewMode === "grid"
                    ? "hsl(var(--text-primary))"
                    : "hsl(var(--text-muted))",
              }}
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <Link to={`/activations/${activationId}/assets/batch`}>
            <Button size="sm" variant="outline" className="gap-2">
              <Layers size={14} /> Gerar em lote
            </Button>
          </Link>
          <Link to={`/activations/${activationId}/assets/new`}>
            <Button size="sm" className="gap-2">
              <Plus size={14} /> Nova peça
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-md"
          style={{
            background: "hsl(var(--surface-2))",
            border: "1px solid hsl(var(--border-subtle))",
          }}
        >
          <span className="text-mono-label">
            {selected.size} selecionada(s)
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5 h-7 text-xs"
            onClick={handleBulkDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            Excluir
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs ml-auto"
            style={{ color: "hsl(var(--text-muted))" }}
          >
            Limpar seleção
          </button>
        </div>
      )}

      {assets.length === 0 ? (
        <div className="empty-state card-base">
          <Image size={32} className="text-txt-ghost" />
          <p className="empty-state__title">Nenhuma peça ainda</p>
          <p className="empty-state__desc">
            {copiesApproved === 0
              ? "Aprove copies antes de criar peças visuais."
              : "Clique em 'Nova peça' para criar sua primeira peça visual."}
          </p>
          {copiesApproved === 0 ? (
            <Link
              to={`/activations/${activationId}/copies`}
              className="btn-primary inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md"
            >
              ← Aprovar copies primeiro
            </Link>
          ) : (
            <Link
              to={`/activations/${activationId}/assets/new`}
              className="btn-primary inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md"
            >
              <Plus size={14} /> Criar primeira peça
            </Link>
          )}
        </div>
      ) : (viewMode === "list" && !isMobile) ? (
        /* ──── LIST VIEW ──── */
        <div
          className="rounded-md overflow-hidden"
          style={{ border: "1px solid hsl(var(--border-subtle))" }}
        >
          <Table>
            <TableHeader>
              <TableRow
                style={{ background: "hsl(var(--surface-2))" }}
              >
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="w-16">Thumb</TableHead>
                <TableHead>Nome / Nomenclatura</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead className="w-16 text-center">V.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow
                  key={asset.id}
                  className={
                    selected.has(asset.id) ? "bg-accent/5" : ""
                  }
                  style={{
                    borderColor: "hsl(var(--border-subtle))",
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(asset.id)}
                      onCheckedChange={() => toggleOne(asset.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {asset.thumb_url ? (
                      <img
                        src={asset.thumb_url}
                        alt=""
                        className="w-12 h-12 rounded-md object-cover"
                        style={{
                          border: "1px solid hsl(var(--border-subtle))",
                        }}
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-md flex items-center justify-center"
                        style={{
                          background: "hsl(var(--surface-3))",
                          border: "1px solid hsl(var(--border-subtle))",
                        }}
                      >
                        {asset.status === "generating" ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                            style={{ color: "hsl(var(--accent))" }}
                          />
                        ) : (
                          <Image
                            size={14}
                            style={{ color: "hsl(var(--text-ghost))" }}
                          />
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingName === asset.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={nameValue}
                          onChange={(e) =>
                            setNameValue(e.target.value)
                          }
                          className="h-7 text-xs font-mono"
                          style={{ maxWidth: 200 }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              saveName(asset.id);
                            if (e.key === "Escape")
                              setEditingName(null);
                          }}
                        />
                        <button
                          onClick={() => saveName(asset.id)}
                          disabled={savingName}
                          className="p-1 rounded transition-colors hover:bg-accent/10"
                          style={{
                            color: "hsl(var(--status-approved))",
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingName(null)}
                          className="p-1 rounded transition-colors hover:bg-accent/10"
                          style={{
                            color: "hsl(var(--text-muted))",
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditName(asset)}
                        className="flex items-center gap-1.5 text-left group"
                      >
                        <span className="text-mono-label">
                          {getDisplayName(asset)}
                        </span>
                        <Pencil
                          size={11}
                          className="opacity-0 group-hover:opacity-60 transition-opacity"
                          style={{
                            color: "hsl(var(--text-muted))",
                          }}
                        />
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-mono px-1.5 py-0.5 rounded text-xs"
                      style={{
                        background: "hsl(var(--surface-3))",
                        color: "hsl(var(--text-secondary))",
                      }}
                    >
                      {(asset as any).asset_formats?.category ||
                        "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-mono-label">
                      v{asset.version}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={asset.status} />
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/activations/${activationId}/assets/${asset.id}`}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "hsl(var(--accent))" }}
                    >
                      Abrir →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* ──── GRID VIEW ──── */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((asset) => (
            <div key={asset.id} className="relative group">
              <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selected.has(asset.id)}
                  onCheckedChange={() => toggleOne(asset.id)}
                  className="bg-background/80 backdrop-blur-sm"
                />
              </div>
              <Link
                to={`/activations/${activationId}/assets/${asset.id}`}
                className="card-base card-interactive block overflow-hidden"
                style={{ padding: 0 }}
              >
                {asset.thumb_url ? (
                  <img
                    src={asset.thumb_url}
                    alt=""
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div
                    className="w-full aspect-square flex items-center justify-center"
                    style={{ background: "hsl(var(--surface-3))" }}
                  >
                    {asset.status === "generating" ? (
                      <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--accent))" }} />
                    ) : (
                      <Image size={24} style={{ color: "hsl(var(--text-ghost))" }} />
                    )}
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <p className="text-[10px] font-medium truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'JetBrains Mono', monospace" }}>
                    {getDisplayName(asset)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px]" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace" }}>v{asset.version}</span>
                    <StatusBadge status={asset.status} />
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {assets.length > 0 && (
        <div
          className="mt-3 text-xs flex items-center gap-4"
          style={{ color: "hsl(var(--text-ghost))" }}
        >
          <span>{assets.length} peça(s) total</span>
          <span>
            {assets.filter((a) => a.status === "approved").length} aprovada(s)
          </span>
          <span>
            {assets.filter((a) => a.status === "review").length} em revisão
          </span>
        </div>
      )}
    </div>
  );
};
