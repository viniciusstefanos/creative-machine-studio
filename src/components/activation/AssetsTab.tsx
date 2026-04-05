import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Image } from "lucide-react";

interface AssetsTabProps {
  activationId: string;
}

export const AssetsTab = ({ activationId }: AssetsTabProps) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("assets")
        .select("*")
        .eq("activation_id", activationId)
        .order("created_at", { ascending: false });
      setAssets(data || []);
      setLoading(false);
    };
    fetch();
  }, [activationId]);

  if (loading) return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div>
      <SectionLabel>Peças Visuais</SectionLabel>
      {assets.length === 0 ? (
        <div className="p-8 rounded-lg text-center mt-4" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
          <Image size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>Nenhuma peça ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="p-4 rounded-lg"
              style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}
            >
              {asset.image_url && (
                <img src={asset.image_url} alt="" className="w-full h-40 object-cover rounded mb-3" />
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                  {asset.category} · v{asset.version}
                </span>
                <StatusBadge status={asset.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
