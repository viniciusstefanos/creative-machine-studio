import { useParams, Link, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQueryWithToast } from "@/hooks/useQueryWithToast";
import { CardSkeleton } from "@/components/ui/CardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
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
  { key: "utm", label: "UTMs", path: "utm" },
  { key: "schedule", label: "Agendamento", path: "schedule" },
  { key: "analytics", label: "Métricas", path: "analytics" },
];

const ActivationHub = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const { data, isLoading } = useQueryWithToast({
    queryKey: ["activation-hub", id],
    queryFn: async () => {
      const { data: act, error } = await supabase
        .from("activations")
        .select("*, clients(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;

      const [copiesReviewRes, assetsReviewRes, briefRes, copiesAllRes, copiesApprovedRes, assetsAllRes, assetsApprovedRes, scheduledRes, campaignsRes] = await Promise.all([
        supabase.from("copies").select("status", { count: "exact" }).eq("activation_id", id!).eq("status", "review"),
        supabase.from("assets").select("status", { count: "exact" }).eq("activation_id", id!).eq("status", "review"),
        supabase.from("briefs").select("objectives").eq("activation_id", id!).single(),
        supabase.from("copies").select("id", { count: "exact" }).eq("activation_id", id!),
        supabase.from("copies").select("id", { count: "exact" }).eq("activation_id", id!).eq("status", "approved"),
        supabase.from("assets").select("id", { count: "exact" }).eq("activation_id", id!),
        supabase.from("assets").select("id", { count: "exact" }).eq("activation_id", id!).eq("status", "approved"),
        supabase.from("scheduled_posts").select("id", { count: "exact" }).eq("activation_id", id!),
        supabase.from("ad_campaigns").select("id", { count: "exact" }).eq("activation_id", id!),
      ]);

      return {
        activation: act,
        clientName: (act as any).clients?.name || "",
        counts: {
          copies: copiesReviewRes.count || 0,
          assets: assetsReviewRes.count || 0,
        },
        workflow: {
          briefDone: !!(briefRes.data?.objectives),
          copiesApproved: copiesApprovedRes.count || 0,
          copiesTotal: copiesAllRes.count || 0,
          assetsApproved: assetsApprovedRes.count || 0,
          assetsTotal: assetsAllRes.count || 0,
          scheduledCount: scheduledRes.count || 0,
          campaignsCount: campaignsRes.count || 0,
        },
      };
    },
    enabled: !!id,
    staleTime: 15_000,
    errorMessage: "Erro ao carregar ativação",
  });

  const pathParts = location.pathname.split("/");
  const tabSegment = pathParts[3] || "brief";
  const isHubRoot = location.pathname === `/activations/${id}`;
  const activeTab = isHubRoot ? "brief" : tabSegment;

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <Skeleton className="h-8 w-64 bg-surface-3" />
            <Skeleton className="h-5 w-16 rounded-full bg-surface-3" />
          </div>
          <Skeleton className="h-4 w-40 bg-surface-3" />
          <Skeleton className="h-10 w-full bg-surface-3 mt-6" />
          <CardSkeleton count={4} />
        </div>
      </AppLayout>
    );
  }

  if (!data?.activation) {
    return (
      <AppLayout breadcrumbs={[{ label: "Ativação não encontrada" }]}>
        <div className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>Ativação não encontrada</div>
      </AppLayout>
    );
  }

  const { activation, clientName, counts, workflow } = data;

  const renderTabContent = () => {
    switch (activeTab) {
      case "brief": return <BriefTab activationId={id!} />;
      case "copies": return <CopiesTab activationId={id!} briefDone={workflow.briefDone} />;
      case "assets": return <AssetsTab activationId={id!} copiesApproved={workflow.copiesApproved} />;
      case "ad-campaigns": return <CampaignsTab activationId={id!} />;
      case "utm": return <UtmTab activationId={id!} landingPageUrl={activation.landing_page_url} />;
      case "schedule": return <ScheduleTab activationId={id!} assetsApproved={workflow.assetsApproved} />;
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

      <WorkflowProgress
        activationId={id!}
        briefDone={workflow.briefDone}
        copiesApproved={workflow.copiesApproved}
        copiesTotal={workflow.copiesTotal}
        assetsApproved={workflow.assetsApproved}
        assetsTotal={workflow.assetsTotal}
        scheduledCount={workflow.scheduledCount}
        campaignsCount={workflow.campaignsCount}
        activeTab={activeTab}
      />

      <div className="flex gap-1 mb-8 overflow-x-auto pb-1" style={{ borderBottom: "1px solid hsl(var(--border-subtle))" }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key || activeTab === tab.path;
          const count = tab.key === "copies" ? counts.copies : tab.key === "assets" ? counts.assets : 0;
          return (
            <Link
              key={tab.key}
              to={`/activations/${id}/${tab.path}`}
              className={`flex items-center gap-2 px-4 py-2.5 text-label whitespace-nowrap transition-all ${
                isActive ? "text-txt-primary" : "text-txt-muted"
              }`}
              style={{
                borderBottom: isActive ? "2px solid hsl(var(--accent))" : "2px solid transparent",
              }}
            >
              {tab.label}
              {count > 0 && (
                <span className="text-mono px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "hsl(var(--status-review) / 0.15)",
                    color: "hsl(var(--status-review))",
                    fontSize: 9,
                  }}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {renderTabContent()}
    </AppLayout>
  );
};

export default ActivationHub;
