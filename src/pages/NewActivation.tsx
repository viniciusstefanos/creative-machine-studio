import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Upload, User } from "lucide-react";

const NewActivation = () => {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "ongoing" as "seasonal" | "ongoing",
    start_date: "",
    end_date: "",
    budget: "",
    landing_page_url: "",
    tags: [] as string[],
    social_display_name: "",
    social_handle: "",
    social_avatar_url: "",
  });

  useEffect(() => {
    if (!clientId) return;
    // Fetch client name + auto-fill social from client_meta_accounts
    Promise.all([
      supabase.from("clients").select("name").eq("id", clientId).single(),
      supabase.from("client_meta_accounts").select("instagram_username, ad_account_name").eq("client_id", clientId).maybeSingle(),
    ]).then(([clientRes, metaRes]) => {
      if (clientRes.data) setClientName(clientRes.data.name);
      if (metaRes.data) {
        setForm((prev) => ({
          ...prev,
          social_handle: prev.social_handle || (metaRes.data.instagram_username ? `@${metaRes.data.instagram_username.replace(/^@/, "")}` : ""),
          social_display_name: prev.social_display_name || metaRes.data.ad_account_name || "",
        }));
      }
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `social-avatars/${clientId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      setForm((prev) => ({ ...prev, social_avatar_url: data.publicUrl }));
    }
    setUploadingAvatar(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !user) return;
    setLoading(true);

    const { error } = await supabase.from("activations").insert([{
      client_id: clientId,
      name: form.name,
      slug: form.slug.toUpperCase().trim() || null,
      type: form.type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget ? parseFloat(form.budget) : null,
      landing_page_url: form.landing_page_url || null,
      tags: form.tags.length > 0 ? form.tags : null,
      created_by: user.id,
      social_display_name: form.social_display_name || null,
      social_handle: form.social_handle || null,
      social_avatar_url: form.social_avatar_url || null,
    } as any]);

    if (!error) {
      navigate(`/clients/${clientId}`);
    }
    setLoading(false);
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName || "...", href: `/clients/${clientId}` },
        { label: "Nova ativação" },
      ]}
    >
      <h1 className="text-display-lg mb-8">Nova Ativação</h1>

      <form onSubmit={handleSubmit} className="max-w-lg">
        <div className="space-y-5">
          <div>
            <label className="field-label">Nome *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field-input"
              placeholder="Ex: Campanha Dia das Mães"
            />
          </div>

          <div>
            <label className="field-label">Sigla da ativação *</label>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
              className="field-input"
              placeholder="Ex: BF26, DDM25"
              maxLength={10}
              style={{ textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "1px" }}
            />
            <p className="text-[10px] mt-1" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
              Identifica campanhas e peças desta ativação. Sem espaços ou caracteres especiais.
            </p>
          </div>

          <div>
            <label className="field-label">Tipo</label>
            <div className="flex gap-2">
              {(["ongoing", "seasonal"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className="px-4 py-2 text-xs font-medium rounded-md"
                  style={{
                    background: form.type === t ? "hsl(var(--accent))" : "hsl(var(--bg-surface2))",
                    color: form.type === t ? "hsl(var(--text-inverse))" : "hsl(var(--text-secondary))",
                    border: form.type === t ? "1px solid hsl(var(--accent))" : "1px solid hsl(var(--border-strong))",
                    fontFamily: "'DM Sans', sans-serif",
                    borderRadius: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  {t === "ongoing" ? "Ongoing" : "Sazonal"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Data início</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Data fim</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Budget (R$)</label>
            <input
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              className="field-input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="field-label">Landing page</label>
            <input
              type="url"
              value={form.landing_page_url}
              onChange={(e) => setForm({ ...form, landing_page_url: e.target.value })}
              className="field-input"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="field-label">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-pointer"
                  style={{
                    background: "hsl(var(--bg-surface3))",
                    color: "hsl(var(--text-secondary))",
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: "all 0.15s ease",
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
              className="field-input"
              placeholder="Digite e pressione Enter"
            />
          </div>

          {/* ═══ PERFIL SOCIAL ═══ */}
          <div className="pt-6 mt-2" style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
            <SectionLabel>Perfil Social</SectionLabel>
            <p className="text-[10px] mt-1 mb-4" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
              Dados exibidos nos templates que mostram perfil (avatar, nome, @handle).
            </p>

            <div className="flex items-start gap-4 mb-4">
              {/* Avatar preview */}
              <div className="shrink-0">
                <label className="cursor-pointer block">
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
                    style={{
                      background: form.social_avatar_url ? "transparent" : "hsl(var(--bg-surface3))",
                      border: "2px dashed hsl(var(--border-strong))",
                    }}
                  >
                    {form.social_avatar_url ? (
                      <img src={form.social_avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : uploadingAvatar ? (
                      <span className="text-[9px]" style={{ color: "hsl(var(--text-muted))" }}>...</span>
                    ) : (
                      <User size={20} style={{ color: "hsl(var(--text-muted))" }} />
                    )}
                  </div>
                </label>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="field-label">Nome de exibição</label>
                  <input
                    value={form.social_display_name}
                    onChange={(e) => setForm({ ...form, social_display_name: e.target.value })}
                    className="field-input"
                    placeholder="Ex: Café & Brasa"
                  />
                </div>
                <div>
                  <label className="field-label">@Handle</label>
                  <input
                    value={form.social_handle}
                    onChange={(e) => setForm({ ...form, social_handle: e.target.value })}
                    className="field-input"
                    placeholder="@perfil"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex justify-end gap-2 mt-6 pt-5"
          style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}
        >
          <button
            type="button"
            onClick={() => navigate(`/clients/${clientId}`)}
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
            {loading ? "Criando..." : "Criar ativação"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
};

export default NewActivation;
