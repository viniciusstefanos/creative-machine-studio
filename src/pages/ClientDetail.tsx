import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [activations, setActivations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [clientRes, activationsRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase
          .from("activations")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setClient(clientRes.data);
      setActivations(activationsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "Clientes", href: "/clients" }, { label: "..." }]}>
        <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans'" }}>
          Carregando...
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout breadcrumbs={[{ label: "Clientes", href: "/clients" }]}>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Cliente não encontrado</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: client.name },
      ]}
    >
      {/* Client Header */}
      <div className="flex items-center gap-4 mb-8">
        {client.logo_url ? (
          <img src={client.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
        ) : (
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{
              background: "var(--bg-surface3)",
              color: "var(--accent)",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {client.name[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
          >
            {client.name}
          </h1>
          {client.contact_email && (
            <p
              className="text-xs mt-0.5"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-muted)",
              }}
            >
              {client.contact_email}
            </p>
          )}
        </div>
      </div>

      {/* Activations */}
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Ativações</SectionLabel>
        <Link
          to={`/clients/${id}/activations/new`}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150"
          style={{
            background: "var(--accent)",
            color: "var(--text-inverse)",
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: 6,
          }}
        >
          <Plus size={14} />
          Nova ativação
        </Link>
      </div>

      {activations.length === 0 ? (
        <div
          className="p-8 rounded-lg text-center text-sm"
          style={{
            background: "var(--bg-surface1)",
            border: "1px solid var(--border-default)",
            color: "var(--text-muted)",
            fontFamily: "'DM Sans'",
          }}
        >
          Nenhuma ativação ainda
        </div>
      ) : (
        <div className="space-y-3">
          {activations.map((act: any) => (
            <Link
              key={act.id}
              to={`/activations/${act.id}`}
              className="flex items-center justify-between p-4 rounded-lg card-interactive transition-all"
              style={{
                background: "hsl(var(--bg-surface1))",
                border: "1px solid hsl(var(--border-default))",
                borderRadius: 8,
              }}
            >
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)", fontFamily: "'DM Sans'" }}
                >
                  {act.name}
                </p>
                <p
                  className="text-[10px] mt-1 uppercase tracking-wider"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--text-muted)",
                  }}
                >
                  {act.type} · {act.start_date || "sem data"}
                </p>
              </div>
              <StatusBadge status={act.status} />
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default ClientDetail;
