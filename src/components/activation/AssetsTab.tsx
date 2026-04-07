import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Image, Plus, Layers } from "lucide-react";

interface AssetsTabProps {
  activationId: string;
  copiesApproved?: number;
}

export const AssetsTab = ({ activationId, copiesApproved }: AssetsTabProps) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("assets")
        .select("*, asset_formats(name, category)")
        .eq("activation_id", activationId)
        .order("created_at", { ascending: false });
      setAssets(data || []);
      setLoading(false);
    };
    fetch();
  }, [activationId]);

  if (loading) return <div className="text-caption">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Peças Visuais</SectionLabel>
        <div className="flex items-center gap-2">
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
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md transition-all"
              style={{
                background: "hsl(var(--accent))",
                color: "hsl(var(--text-inverse))",
                borderRadius: 6,
              }}
            >
              ← Aprovar copies primeiro
            </Link>
          ) : (
            <Link
              to={`/activations/${activationId}/assets/new`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md transition-all"
              style={{
                background: "hsl(var(--accent))",
                color: "hsl(var(--text-inverse))",
                borderRadius: 6,
              }}
            >
              <Plus size={14} /> Criar primeira peça
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              to={`/activations/${activationId}/assets/${asset.id}`}
              className="card-base card-interactive block overflow-hidden"
              style={{ padding: 0 }}
            >
              {asset.image_url && (
                <img src={asset.image_url} alt="" className="w-full h-40 object-cover" />
              )}
              <div className="p-4 flex items-center justify-between">
                <span className="text-mono-label">
                  {(asset as any).asset_formats?.name || asset.category || "—"} · v{asset.version}
                </span>
                <StatusBadge status={asset.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
