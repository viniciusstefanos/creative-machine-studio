import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Image, CheckCircle } from "lucide-react";
import { MetaAccountSettings } from "@/components/client/MetaAccountSettings";
import { ClientTemplates } from "@/components/client/ClientTemplates";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [activations, setActivations] = useState<any[]>([]);
  const [volumeStats, setVolumeStats] = useState({ assets: 0, approved: 0, published: 0, copies: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [clientRes, activationsRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("activations").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      ]);
      setClient(clientRes.data);
      const acts = activationsRes.data || [];
      setActivations(acts);

      // Fetch volume stats across all activations
      if (acts.length > 0) {
        const actIds = acts.map((a: any) => a.id);
        const [assetsRes, copiesRes, scheduledRes] = await Promise.all([
          supabase.from("assets").select("status").in("activation_id", actIds),
          supabase.from("copies").select("id", { count: "exact", head: true }).in("activation_id", actIds),
          supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).in("activation_id", actIds).eq("status", "published"),
        ]);
        const assets = assetsRes.data || [];
        setVolumeStats({
          assets: assets.length,
          approved: assets.filter((a) => a.status === "approved").length,
          published: scheduledRes.count || 0,
          copies: copiesRes.count || 0,
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "Clientes", href: "/clients" }, { label: "..." }]}>
        <p className="text-caption">Carregando...</p>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout breadcrumbs={[{ label: "Clientes", href: "/clients" }]}>
        <p className="text-caption">Cliente não encontrado</p>
      </AppLayout>
    );
  }

  const volumeCards = [
    { label: "Copies", value: volumeStats.copies, icon: FileText },
    { label: "Peças", value: volumeStats.assets, icon: Image },
    { label: "Aprovadas", value: volumeStats.approved, icon: CheckCircle },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: "Clientes", href: "/clients" }, { label: client.name }]}>
      {/* Client Header */}
      <div className="flex items-center gap-4 mb-8">
        {client.logo_url ? (
          <img src={client.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold bg-surface-3 text-accent" style={{ fontFamily: "'Syne', sans-serif" }}>
            {client.name[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-display-lg">{client.name}</h1>
          {client.contact_email && <p className="text-mono-label mt-0.5">{client.contact_email}</p>}
        </div>
      </div>

      {/* Volume Summary */}
      {activations.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {volumeCards.map((c) => (
            <div key={c.label} className="card-base flex items-center gap-3">
              <c.icon size={18} style={{ color: "hsl(var(--accent))" }} />
              <div>
                <p className="text-mono-label">{c.label}</p>
                <p className="text-display-lg !text-xl">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activations */}
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Ativações</SectionLabel>
        <Link
          to={`/clients/${id}/activations/new`}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium btn-primary"
        >
          <Plus size={14} /> Nova ativação
        </Link>
      </div>

      {activations.length === 0 ? (
        <div className="empty-state card-base">
          <p className="empty-state__title">Nenhuma ativação ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activations.map((act: any) => (
            <Link key={act.id} to={`/activations/${act.id}`} className="card-base card-interactive flex items-center justify-between">
              <div>
                <p className="text-body font-medium">{act.name}</p>
                <p className="text-mono-label mt-1">{act.type} · {act.start_date || "sem data"}</p>
              </div>
              <StatusBadge status={act.status} />
            </Link>
          ))}
        </div>
      )}

      {/* Templates */}
      <ClientTemplates clientId={id!} />

      {/* Meta Accounts */}
      <div className="mt-8">
        <MetaAccountSettings clientId={id!} />
      </div>
    </AppLayout>
  );
};

export default ClientDetail;
