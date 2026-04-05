import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NewActivation = () => {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "ongoing" as "seasonal" | "ongoing",
    start_date: "",
    end_date: "",
    budget: "",
    landing_page_url: "",
    tags: [] as string[],
  });

  useEffect(() => {
    if (!clientId) return;
    supabase.from("clients").select("name").eq("id", clientId).single().then(({ data }) => {
      if (data) setClientName(data.name);
    });
  }, [clientId]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (idx: number) => {
    setForm({ ...form, tags: form.tags.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !user) return;
    setLoading(true);

    const { error } = await supabase.from("activations").insert([{
      client_id: clientId,
      name: form.name,
      type: form.type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget ? parseFloat(form.budget) : null,
      landing_page_url: form.landing_page_url || null,
      tags: form.tags.length > 0 ? form.tags : null,
      created_by: user.id,
    }]);

    if (!error) {
      navigate(`/clients/${clientId}`);
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
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName || "...", href: `/clients/${clientId}` },
        { label: "Nova ativação" },
      ]}
    >
      <h1
        className="text-2xl font-bold mb-8"
        style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
      >
        Nova Ativação
      </h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
            Nome *
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-150 focus:border-[var(--accent)]"
            style={inputStyle}
            placeholder="Ex: Campanha Dia das Mães"
          />
        </div>

        {/* Type Toggle */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
            Tipo
          </label>
          <div className="flex gap-2">
            {(["ongoing", "seasonal"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className="px-4 py-2 text-xs font-medium rounded-md transition-all duration-150"
                style={{
                  background: form.type === t ? "var(--accent)" : "var(--bg-surface2)",
                  color: form.type === t ? "var(--text-inverse)" : "var(--text-secondary)",
                  border: form.type === t ? "none" : "1px solid var(--border-strong)",
                  fontFamily: "'DM Sans'",
                  borderRadius: 6,
                }}
              >
                {t === "ongoing" ? "Ongoing" : "Sazonal"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
              Data início
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-150"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
              Data fim
            </label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-150"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
            Budget (R$)
          </label>
          <input
            type="number"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-150"
            style={inputStyle}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
            Landing page
          </label>
          <input
            type="url"
            value={form.landing_page_url}
            onChange={(e) => setForm({ ...form, landing_page_url: e.target.value })}
            className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-150"
            style={inputStyle}
            placeholder="https://..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans'" }}>
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-pointer"
                style={{
                  background: "var(--bg-surface3)",
                  color: "var(--text-secondary)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                onClick={() => handleRemoveTag(i)}
              >
                {tag} ×
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-150"
            style={inputStyle}
            placeholder="Digite e pressione Enter"
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
              fontFamily: "'DM Sans'",
              borderRadius: 6,
            }}
          >
            {loading ? "Criando..." : "Criar ativação"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/clients/${clientId}`)}
            className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-150"
            style={{
              background: "var(--bg-surface2)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-primary)",
              fontFamily: "'DM Sans'",
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

export default NewActivation;
