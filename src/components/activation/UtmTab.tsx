import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";

interface UtmTabProps {
  activationId: string;
  landingPageUrl?: string;
}

export const UtmTab = ({ activationId, landingPageUrl }: UtmTabProps) => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("utm_configs")
        .select("*")
        .eq("activation_id", activationId)
        .single();
      if (data) {
        setConfig(data);
        setForm({
          utm_source: data.utm_source || "",
          utm_medium: data.utm_medium || "",
          utm_campaign: data.utm_campaign || "",
          utm_content: data.utm_content || "",
          utm_term: data.utm_term || "",
        });
      }
      setLoading(false);
    };
    fetch();
  }, [activationId]);

  const generatedUrl = (() => {
    const base = landingPageUrl || "https://exemplo.com";
    const params = new URLSearchParams();
    if (form.utm_source) params.set("utm_source", form.utm_source);
    if (form.utm_medium) params.set("utm_medium", form.utm_medium);
    if (form.utm_campaign) params.set("utm_campaign", form.utm_campaign);
    if (form.utm_content) params.set("utm_content", form.utm_content);
    if (form.utm_term) params.set("utm_term", form.utm_term);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  })();

  const handleSave = async () => {
    setSaving(true);
    if (config) {
      await supabase.from("utm_configs").update({ ...form, generated_url: generatedUrl }).eq("id", config.id);
    } else {
      await supabase.from("utm_configs").insert([{ activation_id: activationId, ...form, generated_url: generatedUrl }]);
    }
    setSaving(false);
  };

  const inputStyle = {
    background: "hsl(var(--bg-base))",
    border: "1px solid hsl(var(--border-strong))",
    color: "hsl(var(--text-primary))",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: 6,
  };

  if (loading) return <div className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>Carregando...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <SectionLabel>Configuração UTM</SectionLabel>

      <div className="grid grid-cols-2 gap-4">
        {[
          { key: "utm_source", label: "Source", placeholder: "facebook, google, newsletter" },
          { key: "utm_medium", label: "Medium", placeholder: "cpc, social, email" },
          { key: "utm_campaign", label: "Campaign", placeholder: "dia-das-maes-2025" },
          { key: "utm_content", label: "Content", placeholder: "banner-hero, cta-rodape" },
          { key: "utm_term", label: "Term", placeholder: "sapatos+femininos" },
        ].map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
              {field.label}
            </label>
            <input
              value={(form as any)[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-150"
              style={inputStyle}
              placeholder={field.placeholder}
            />
          </div>
        ))}
      </div>

      {/* Generated URL */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
          URL gerada
        </label>
        <div
          className="p-3 rounded-md text-xs break-all"
          style={{
            background: "hsl(var(--bg-base))",
            border: "1px solid hsl(var(--border-default))",
            color: "hsl(var(--accent))",
            fontFamily: "'JetBrains Mono', monospace",
            borderRadius: 6,
          }}
        >
          {generatedUrl}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-150 disabled:opacity-50"
        style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-inverse))", fontFamily: "'DM Sans'", borderRadius: 6 }}
      >
        {saving ? "Salvando..." : "Salvar UTMs"}
      </button>
    </div>
  );
};
