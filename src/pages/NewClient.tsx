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

  const inputStyle = {
    background: "var(--bg-base)",
    border: "1px solid var(--border-strong)",
    color: "var(--text-primary)",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: 6,
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Clientes", href: "/clients" }, { label: "Novo cliente" }]}>
      <h1
        className="text-2xl font-bold mb-8"
        style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
      >
        Novo Cliente
      </h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}
          >
            Nome *
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 text-sm rounded-md outline-none transition-all duration-150 focus:border-[var(--accent)]"
            style={inputStyle}
            placeholder="Nome do cliente"
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}
          >
            Nome do contato
          </label>
          <input
            type="text"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            className="w-full px-3 py-2.5 text-sm rounded-md outline-none transition-all duration-150 focus:border-[var(--accent)]"
            style={inputStyle}
            placeholder="Pessoa responsável"
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}
          >
            E-mail do contato
          </label>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            className="w-full px-3 py-2.5 text-sm rounded-md outline-none transition-all duration-150 focus:border-[var(--accent)]"
            style={inputStyle}
            placeholder="email@exemplo.com"
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}
          >
            URL do logo
          </label>
          <input
            type="url"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            className="w-full px-3 py-2.5 text-sm rounded-md outline-none transition-all duration-150 focus:border-[var(--accent)]"
            style={inputStyle}
            placeholder="https://..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-150 disabled:opacity-50"
            style={{
              background: "var(--accent)",
              color: "var(--text-inverse)",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 6,
            }}
          >
            {loading ? "Criando..." : "Criar cliente"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-150"
            style={{
              background: "var(--bg-surface2)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-primary)",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 6,
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </AppLayout>
  );
};

export default NewClient;
