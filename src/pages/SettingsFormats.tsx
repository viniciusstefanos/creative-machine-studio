import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, X, Check } from "lucide-react";

const categories = ["social", "display", "email", "video", "print"];

const SettingsFormats = () => {
  const [formats, setFormats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", category: "social", prompt_hint: "" });
  const [saving, setSaving] = useState(false);

  const fetchFormats = async () => {
    const { data } = await supabase.from("asset_formats").select("*").order("category").order("name");
    setFormats(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchFormats(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editId) {
      await supabase.from("asset_formats").update(form).eq("id", editId);
      setEditId(null);
    } else {
      await supabase.from("asset_formats").insert([form]);
    }
    setForm({ name: "", slug: "", category: "social", prompt_hint: "" });
    setShowForm(false);
    fetchFormats();
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("asset_formats").update({ active: !active }).eq("id", id);
    fetchFormats();
  };

  const startEdit = (f: any) => {
    setForm({ name: f.name || "", slug: f.slug || "", category: f.category || "social", prompt_hint: f.prompt_hint || "" });
    setEditId(f.id);
    setShowForm(true);
  };

  const inputStyle = {
    background: "hsl(var(--bg-base))",
    border: "1px solid var(--border-strong)",
    color: "hsl(var(--text-primary))",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: 6,
  };

  const grouped = categories.map((cat) => ({ cat, items: formats.filter((f) => f.category === cat) })).filter((g) => g.items.length > 0);

  return (
    <AppLayout breadcrumbs={[{ label: "Configurações" }, { label: "Formatos" }]}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "hsl(var(--text-primary))" }}>
          Formatos de Peça
        </h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: "", slug: "", category: "social", prompt_hint: "" }); }}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150"
          style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-inverse))", fontFamily: "'DM Sans'", borderRadius: 6 }}
        >
          <Plus size={14} /> Novo formato
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-lg mb-6 space-y-4" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid var(--border-default)", borderRadius: 8 }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Nome</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="Feed Quadrado" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="feed-square" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Categoria</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Prompt Hint</label>
            <textarea value={form.prompt_hint} onChange={(e) => setForm({ ...form, prompt_hint: e.target.value })} rows={2} className="w-full px-3 py-2.5 text-sm outline-none resize-none" style={inputStyle} placeholder="Dica para geração de assets..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium rounded-md disabled:opacity-50" style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-inverse))", fontFamily: "'DM Sans'", borderRadius: 6 }}>
              {editId ? "Atualizar" : "Criar"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-5 py-2 text-sm font-medium rounded-md" style={{ background: "hsl(var(--bg-surface2))", border: "1px solid var(--border-strong)", color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'", borderRadius: 6 }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>Carregando...</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <SectionLabel>{cat.toUpperCase()}</SectionLabel>
              <div className="space-y-2 mt-3">
                {items.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-4 p-4 rounded-lg"
                    style={{
                      background: "hsl(var(--bg-surface1))",
                      border: "1px solid var(--border-default)",
                      borderRadius: 8,
                      opacity: f.active ? 1 : 0.5,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>{f.name}</p>
                      <p className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>{f.slug}</p>
                    </div>
                    <button onClick={() => startEdit(f)} className="p-1.5 rounded transition-all duration-150" style={{ color: "hsl(var(--text-muted))" }}>
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => toggleActive(f.id, f.active)}
                      className="px-2 py-1 text-[10px] font-medium rounded transition-all duration-150"
                      style={{
                        background: f.active ? "color-mix(in srgb, var(--status-approved) 15%, transparent)" : "hsl(var(--bg-surface3))",
                        color: f.active ? "var(--status-approved)" : "hsl(var(--text-muted))",
                        fontFamily: "'JetBrains Mono', monospace",
                        borderRadius: 6,
                      }}
                    >
                      {f.active ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default SettingsFormats;
