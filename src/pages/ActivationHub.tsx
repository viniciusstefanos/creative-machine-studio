import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";

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

      const [copiesRes, assetsRes] = await Promise.all([
        supabase.from("copies").select("status", { count: "exact" }).eq("activation_id", id).eq("status", "review"),
        supabase.from("assets").select("status", { count: "exact" }).eq("activation_id", id).eq("status", "review"),
      ]);

      setCounts({
        copies: copiesRes.count || 0,
        assets: assetsRes.count || 0,
      });
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const currentTab = location.pathname.split("/").pop() || "";
  const isHubRoot = location.pathname === `/activations/${id}`;

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
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
          >
            {activation.name}
          </h1>
          <StatusBadge status={activation.status} />
        </div>
        <div className="flex items-center gap-4">
          <span
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: "var(--bg-surface3)",
              color: "var(--text-secondary)",
            }}
          >
            {activation.type}
          </span>
          {activation.budget && (
            <span
              className="text-xs"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-muted)",
              }}
            >
              R$ {Number(activation.budget).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-8 overflow-x-auto pb-1"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {tabs.map((tab) => {
          const isActive = isHubRoot
            ? tab.key === "brief"
            : currentTab === tab.path;
          const count =
            tab.key === "copies" ? counts.copies : tab.key === "assets" ? counts.assets : 0;

          return (
            <Link
              key={tab.key}
              to={`/activations/${id}/${tab.path}`}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-all duration-150 whitespace-nowrap"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
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

      {/* Tab Content Placeholder */}
      <div
        className="p-8 rounded-lg text-center"
        style={{
          background: "var(--bg-surface1)",
          border: "1px solid var(--border-default)",
          borderRadius: 8,
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>
          Selecione uma aba acima para navegar
        </p>
      </div>
    </AppLayout>
  );
};

export default ActivationHub;
