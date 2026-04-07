import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { BriefTab } from "@/components/activation/BriefTab";
import { CopiesTab } from "@/components/activation/CopiesTab";
import { AssetsTab } from "@/components/activation/AssetsTab";
import { UtmTab } from "@/components/activation/UtmTab";
import { ScheduleTab } from "@/components/activation/ScheduleTab";
import { AnalyticsTab } from "@/components/activation/AnalyticsTab";
import { CampaignsTab } from "@/components/activation/CampaignsTab";
import { WorkflowProgress } from "@/components/activation/WorkflowProgress";

const tabs = [
  { key: "brief", label: "Brief", path: "brief" },
  { key: "copies", label: "Copies", path: "copies" },
  { key: "assets", label: "Peças", path: "assets" },
  { key: "ad-campaigns", label: "Campanhas", path: "ad-campaigns" },
  { key: "utm", label: "UTMs", path: "utm" },
  { key: "schedule", label: "Agendamento", path: "schedule" },
  { key: "analytics", label: "Métricas", path: "analytics" },
];

const ActivationHub = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [activation, setActivation] = useState<any>(null);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [workflowData, setWorkflowData] = useState({
    briefDone: false,
    copiesApproved: 0,
    copiesTotal: 0,
    assetsApproved: 0,
    assetsTotal: 0,
    scheduledCount: 0,
  });

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: act } = await supabase
        .from("activations")
        .select("*, clients(name)")
        .eq("id", id)
        .single();

      if (act) {
        setActivation(act);
        setClientName((act as any).clients?.name || "");
      }

      const [copiesReviewRes, assetsReviewRes, briefRes, copiesAllRes, copiesApprovedRes, assetsAllRes, assetsApprovedRes, scheduledRes] = await Promise.all([
        supabase.from("copies").select("status", { count: "exact" }).eq("activation_id", id!).eq("status", "review"),
        supabase.from("assets").select("status", { count: "exact" }).eq("activation_id", id!).eq("status", "review"),
        supabase.from("briefs").select("objectives").eq("activation_id", id!).single(),
        supabase.from("copies").select("id", { count: "exact" }).eq("activation_id", id!),
        supabase.from("copies").select("id", { count: "exact" }).eq("activation_id", id!).eq("status", "approved"),
        supabase.from("assets").select("id", { count: "exact" }).eq("activation_id", id!),
        supabase.from("assets").select("id", { count: "exact" }).eq("activation_id", id!).eq("status", "approved"),
        supabase.from("scheduled_posts").select("id", { count: "exact" }).eq("activation_id", id!),
      ]);

      setCounts({
        copies: copiesReviewRes.count || 0,
        assets: assetsReviewRes.count || 0,
      });

      setWorkflowData({
        briefDone: !!(briefRes.data?.objectives),
        copiesApproved: copiesApprovedRes.count || 0,
        copiesTotal: copiesAllRes.count || 0,
        assetsApproved: assetsApprovedRes.count || 0,
        assetsTotal: assetsAllRes.count || 0,
        scheduledCount: scheduledRes.count || 0,
      });

      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Determine active tab from URL
  const pathParts = location.pathname.split("/");
  const tabSegment = pathParts[3] || "brief";
  const isHubRoot = location.pathname === `/activations/${id}`;
  const activeTab = isHubRoot ? "brief" : tabSegment;

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</div>
      </AppLayout>
    );
  }

  if (!activation) {
    return (
      <AppLayout breadcrumbs={[{ label: "Ativação não encontrada" }]}>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Ativação não encontrada</div>
      </AppLayout>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "brief": return <BriefTab activationId={id!} />;
      case "copies": return <CopiesTab activationId={id!} briefDone={workflowData.briefDone} />;
      case "assets": return <AssetsTab activationId={id!} copiesApproved={workflowData.copiesApproved} />;
      case "ad-campaigns": return <CampaignsTab activationId={id!} />;
      case "utm": return <UtmTab activationId={id!} landingPageUrl={activation.landing_page_url} />;
      case "schedule": return <ScheduleTab activationId={id!} assetsApproved={workflowData.assetsApproved} />;
      case "analytics": return <AnalyticsTab activationId={id!} />;
      default: return <BriefTab activationId={id!} />;
    }
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName, href: `/clients/${activation.client_id}` },
        { label: activation.name },
      ]}
    >
      {/* Activation Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-display-lg">{activation.name}</h1>
          <StatusBadge status={activation.status} />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-mono px-2 py-0.5 rounded bg-surface-3 text-txt-secondary">
            {activation.type}
          </span>
          {activation.budget && (
            <span className="text-mono text-txt-muted">
              R$ {Number(activation.budget).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      <WorkflowProgress
        activationId={id!}
        briefDone={workflowData.briefDone}
        copiesApproved={workflowData.copiesApproved}
        copiesTotal={workflowData.copiesTotal}
        assetsApproved={workflowData.assetsApproved}
        assetsTotal={workflowData.assetsTotal}
        scheduledCount={workflowData.scheduledCount}
        activeTab={activeTab}
      />

      {/* Tabs */}
      <div
        className="flex gap-1 mb-8 overflow-x-auto pb-1"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key || activeTab === tab.path;
          const count = tab.key === "copies" ? counts.copies : tab.key === "assets" ? counts.assets : 0;

          return (
            <Link
              key={tab.key}
              to={`/activations/${id}/${tab.path}`}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: isActive ? "hsl(var(--text-primary))" : "hsl(var(--text-muted))",
                borderBottom: isActive ? "2px solid hsl(var(--accent))" : "2px solid transparent",
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "color-mix(in srgb, var(--status-review) 15%, transparent)",
                    color: "var(--status-review)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </AppLayout>
  );
};

export default ActivationHub;
