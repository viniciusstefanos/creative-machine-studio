import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Image, Plus } from "lucide-react";

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

  if (loading) return <div className="text-sm text-txt-muted">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Peças Visuais</SectionLabel>
        <Link to={`/activations/${activationId}/assets/new`}>
          <Button size="sm" className="gap-2">
            <Plus size={14} /> Nova peça
          </Button>
        </Link>
      </div>
      {assets.length === 0 ? (
        <div className="p-8 rounded-lg text-center" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
          <Image size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>Nenhuma peça ainda</p>
          {copiesApproved === 0 ? (
            <Link
              to={`/activations/${activationId}/copies`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md transition-all"
              style={{ background: "var(--accent)", color: "var(--text-inverse)", borderRadius: 6 }}
            >
              ← Aprovar copies primeiro
            </Link>
          ) : (
            <Link
              to={`/activations/${activationId}/assets/new`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md transition-all"
              style={{ background: "var(--accent)", color: "var(--text-inverse)", borderRadius: 6 }}
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
              className="p-4 rounded-lg transition-all duration-150 hover:bg-surface-2 block"
              style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}
            >
              {asset.image_url && (
                <img src={asset.image_url} alt="" className="w-full h-40 object-cover rounded mb-3" />
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
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
