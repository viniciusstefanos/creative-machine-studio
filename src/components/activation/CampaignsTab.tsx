import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";

interface CampaignsTabProps {
  activationId: string;
}

export const CampaignsTab = ({ activationId }: CampaignsTabProps) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("activation_id", activationId)
        .order("created_at", { ascending: false });
      setCampaigns(data || []);
      setLoading(false);
    };
    fetch();
  }, [activationId]);

  if (loading) return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div>
      <SectionLabel>Campanhas de Ads</SectionLabel>
      {campaigns.length === 0 ? (
        <div className="p-8 rounded-lg text-center mt-4" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
          <Megaphone size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>Nenhuma campanha de ads</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans'" }}>
                  {campaign.name || "Campanha sem nome"}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                    {campaign.platform} · {campaign.objective || "—"}
                  </span>
                  {campaign.budget && (
                    <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                      R$ {Number(campaign.budget).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={campaign.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
