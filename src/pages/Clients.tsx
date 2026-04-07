import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Building2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      setClients(data || []);
      setLoading(false);
    };
    fetchClients();
  }, []);

  return (
    <AppLayout breadcrumbs={[{ label: "Clientes" }]}>
      <div className="flex items-center justify-between mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Syne', sans-serif", color: "hsl(var(--text-primary))" }}
        >
          Clientes
        </h1>
        <Link
          to="/clients/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-150"
          style={{
            background: "hsl(var(--accent))",
            color: "hsl(var(--text-inverse))",
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: 6,
          }}
        >
          <Plus size={16} />
          Novo cliente
        </Link>
      </div>

      {loading ? (
        <div className="text-sm" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
          Carregando...
        </div>
      ) : clients.length === 0 ? (
        <div
          className="p-12 rounded-lg text-center"
          style={{
            background: "hsl(var(--bg-surface1))",
            border: "1px solid hsl(var(--border-default))",
            borderRadius: 8,
          }}
        >
          <Building2
            size={40}
            className="mx-auto mb-4"
            style={{ color: "hsl(var(--text-muted))" }}
          />
          <p
            className="text-sm mb-1"
            style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}
          >
            Nenhum cliente cadastrado
          </p>
          <p
            className="text-xs"
            style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}
          >
            Clique em "Novo cliente" para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="p-5 rounded-lg card-interactive transition-all group"
              style={{
                background: "hsl(var(--bg-surface1))",
                border: "1px solid hsl(var(--border-default))",
                borderRadius: 8,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                {client.logo_url ? (
                  <img
                    src={client.logo_url}
                    alt=""
                    className="w-10 h-10 rounded-md object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold"
                    style={{
                      background: "hsl(var(--bg-surface3))",
                      color: "hsl(var(--accent))",
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    {client.name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}
                  >
                    {client.name}
                  </p>
                  {client.contact_name && (
                    <p
                      className="text-[11px]"
                      style={{
                        color: "hsl(var(--text-muted))",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {client.contact_name}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default Clients;
