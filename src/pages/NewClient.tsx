import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";

const NewClient = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    contact_email: "",
    logo_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("clients").insert([form]);
    if (!error) {
      navigate("/clients");
    }
    setLoading(false);
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Clientes", href: "/clients" }, { label: "Novo cliente" }]}>
      <h1 className="text-display-lg mb-8">Novo Cliente</h1>

      <form onSubmit={handleSubmit} className="max-w-lg">
        <div className="space-y-5">
          <div>
            <label className="field-label">Nome *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field-input"
              placeholder="Nome do cliente"
            />
          </div>

          <div>
            <label className="field-label">Nome do contato</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              className="field-input"
              placeholder="Pessoa responsável"
            />
          </div>

          <div>
            <label className="field-label">E-mail do contato</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              className="field-input"
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <label className="field-label">URL do logo</label>
            <input
              type="url"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              className="field-input"
              placeholder="https://..."
            />
          </div>
        </div>

        <div
          className="flex justify-end gap-2 mt-6 pt-5"
          style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}
        >
          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="px-4 py-2 text-xs rounded-md"
            style={{
              background: "transparent",
              color: "hsl(var(--text-secondary))",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 6,
              border: "1px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-medium rounded-md disabled:opacity-40"
            style={{
              background: "hsl(var(--accent))",
              color: "hsl(var(--text-inverse))",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 6,
              border: "1px solid hsl(var(--accent))",
              transition: "all 0.15s ease",
              letterSpacing: "0.2px",
            }}
          >
            {loading ? "Criando..." : "Criar cliente"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
};

export default NewClient;
