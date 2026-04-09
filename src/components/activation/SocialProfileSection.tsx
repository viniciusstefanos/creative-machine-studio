import { useState, useEffect } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User, Save } from "lucide-react";

interface SocialProfileSectionProps {
  activationId: string;
}

export const SocialProfileSection = ({ activationId }: SocialProfileSectionProps) => {
  const [form, setForm] = useState({
    social_display_name: "",
    social_handle: "",
    social_avatar_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("activations")
      .select("social_display_name, social_handle, social_avatar_url")
      .eq("id", activationId)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            social_display_name: (data as any).social_display_name || "",
            social_handle: (data as any).social_handle || "",
            social_avatar_url: (data as any).social_avatar_url || "",
          });
        }
        setLoaded(true);
      });
  }, [activationId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `social-avatars/${activationId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      setForm((prev) => ({ ...prev, social_avatar_url: data.publicUrl }));
    }
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from("activations")
      .update({
        social_display_name: form.social_display_name || null,
        social_handle: form.social_handle || null,
        social_avatar_url: form.social_avatar_url || null,
      } as any)
      .eq("id", activationId);
    setSaving(false);
    toast({ title: "Perfil social salvo!" });
  };

  if (!loaded) return null;

  return (
    <div className="pt-6 mt-2" style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Perfil Social</SectionLabel>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all disabled:opacity-40"
          style={{
            background: "hsl(var(--bg-surface3))",
            color: "hsl(var(--accent))",
            border: "1px solid hsl(var(--accent) / 0.3)",
            borderRadius: 6,
            fontFamily: "'DM Sans'",
          }}
        >
          <Save size={12} />
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
      </div>
      <p className="text-[10px] mb-4" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
        Dados exibidos nos templates que mostram perfil (avatar, nome, @handle).
      </p>

      <div className="flex items-start gap-4">
        {/* Avatar */}
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
  );
};
