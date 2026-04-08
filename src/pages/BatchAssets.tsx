import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Layers, Zap } from "lucide-react";
import { buildAssetName } from "@/lib/assetNaming";

const BatchAssets = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copies, setCopies] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [activation, setActivation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [copiesRes, templatesRes, actRes] = await Promise.all([
        supabase.from("copies").select("*").eq("activation_id", id).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.from("asset_templates").select("*").eq("active", true).order("name"),
        supabase.from("activations").select("*, clients(name)").eq("id", id).single(),
      ]);
      setCopies(copiesRes.data || []);
      setTemplates(templatesRes.data || []);
      setActivation(actRes.data);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const toggleCell = (copyId: string, templateId: string) => {
    const key = `${copyId}::${templateId}`;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set<string>();
    copies.forEach((c) => templates.forEach((t) => all.add(`${c.id}::${t.id}`)));
    setSelected(all);
  };

  const deselectAll = () => setSelected(new Set());

  const handleGenerate = async () => {
    if (selected.size === 0 || !id) return;
    setGenerating(true);
    setProgress({ done: 0, total: selected.size });

    const items = Array.from(selected).map((key) => {
      const [copy_id, template_id] = key.split("::");
      return { copy_id, template_id };
    });

    // Get current asset count for sequential naming
    const { count: existingCount } = await supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("activation_id", id);
    let seq = (existingCount || 0) + 1;

    // Process sequentially to avoid rate limits
    for (let i = 0; i < items.length; i++) {
      const { copy_id, template_id } = items[i];
      const copy = copies.find((c) => c.id === copy_id);
      const template = templates.find((t) => t.id === template_id);
      const assetName = buildAssetName(seq, template?.category || "static", copy?.hook);
      seq++;

      try {
        const { data: asset } = await supabase
          .from("assets")
          .insert({
            activation_id: id,
            copy_id,
            template_id,
            status: "generating",
            category: template?.category || "static",
            render_config: {},
            name: assetName,
          })
          .select()
          .single();

        if (asset) {
          supabase.functions.invoke("generate-asset-from-template", {
            body: { asset_id: asset.id, activation_id: id, copy_id, template_id, render_config: {} },
          }).catch((err) => console.error("batch gen error:", err));
        }
      } catch (err) {
        console.error("batch insert error:", err);
      }
      setProgress({ done: i + 1, total: items.length });
    }

    setGenerating(false);
    toast({ title: "Lote concluído", description: `${items.length} peças enviadas para geração.` });
    navigate(`/activations/${id}/assets`);
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <p className="text-body-sm">Carregando...</p>
      </AppLayout>
    );
  }

  const clientName = (activation as any)?.clients?.name || "";

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName, href: `/clients/${activation?.client_id}` },
        { label: activation?.name || "", href: `/activations/${id}/assets` },
        { label: "Gerar em Lote" },
      ]}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display-lg">Matriz Generativa</h1>
          <p className="text-caption mt-1">Selecione combinações de copies × templates para gerar em lote</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={selectAll}>Selecionar tudo</Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>Limpar</Button>
          <Button
            size="sm"
            className="gap-2"
            disabled={selected.size === 0 || generating}
            onClick={handleGenerate}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Gerar {selected.size} peça{selected.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>

      {generating && (
        <div className="card-base mb-6 space-y-2">
          <p className="text-mono-label">Gerando {progress.done} / {progress.total}</p>
          <Progress value={(progress.done / progress.total) * 100} className="h-2" />
        </div>
      )}

      {copies.length === 0 ? (
        <div className="empty-state card-base">
          <Layers size={32} className="text-txt-ghost" />
          <p className="empty-state__title">Nenhum copy aprovado</p>
          <p className="empty-state__desc">Aprove copies antes de gerar peças em lote.</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="empty-state card-base">
          <Layers size={32} className="text-txt-ghost" />
          <p className="empty-state__title">Nenhum template disponível</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-mono-label text-left p-2 sticky left-0 bg-base z-10" style={{ minWidth: 180 }}>
                  Copies ↓ / Templates →
                </th>
                {templates.map((t) => (
                  <th key={t.id} className="text-mono-label text-center p-2" style={{ minWidth: 120 }}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] truncate max-w-[100px]">{t.name}</span>
                      <span className="text-[9px] text-txt-ghost">{t.width_px}×{t.height_px}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {copies.map((c) => (
                <tr key={c.id} className="border-t border-line-subtle">
                  <td className="p-2 sticky left-0 bg-base z-10">
                    <p className="text-body-sm truncate max-w-[200px]">{c.hook || c.body || "—"}</p>
                    <p className="text-mono-label">{c.channel} · v{c.version}</p>
                  </td>
                  {templates.map((t) => {
                    const key = `${c.id}::${t.id}`;
                    return (
                      <td key={t.id} className="text-center p-2">
                        <Checkbox
                          checked={selected.has(key)}
                          onCheckedChange={() => toggleCell(c.id, t.id)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};

export default BatchAssets;
