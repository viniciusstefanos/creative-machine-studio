import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, Zap } from "lucide-react";

interface UtmTabProps {
  activationId: string;
  landingPageUrl?: string;
}

const CHANNELS = [
  { key: "default", label: "Padrão" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "google_ads", label: "Google Ads" },
  { key: "email", label: "E-mail" },
  { key: "organic_social", label: "Social Orgânico" },
];

const META_MACROS: Record<string, { label: string; options: { value: string; label: string }[] }> = {
  utm_campaign: {
    label: "Campaign",
    options: [
      { value: "", label: "Texto fixo" },
      { value: "{{campaign.name}}", label: "{{campaign.name}}" },
      { value: "{{campaign.id}}", label: "{{campaign.id}}" },
    ],
  },
  utm_content: {
    label: "Content",
    options: [
      { value: "", label: "Texto fixo" },
      { value: "{{ad.name}}", label: "{{ad.name}}" },
      { value: "{{adset.name}}", label: "{{adset.name}}" },
      { value: "{{ad.id}}", label: "{{ad.id}}" },
    ],
  },
  utm_term: {
    label: "Term",
    options: [
      { value: "", label: "Texto fixo" },
      { value: "{{adset.name}}", label: "{{adset.name}}" },
      { value: "{{adset.id}}", label: "{{adset.id}}" },
    ],
  },
};

interface UtmConfig {
  id?: string;
  channel: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  use_dynamic_params: boolean;
  dynamic_content_pattern: string;
}

const emptyConfig = (channel: string): UtmConfig => ({
  channel,
  utm_source: channel === "meta_ads" ? "facebook" : channel === "google_ads" ? "google" : channel === "email" ? "newsletter" : "",
  utm_medium: channel === "meta_ads" ? "cpc" : channel === "google_ads" ? "cpc" : channel === "email" ? "email" : channel === "organic_social" ? "social" : "",
  utm_campaign: "",
  utm_content: "",
  utm_term: "",
  use_dynamic_params: channel === "meta_ads",
  dynamic_content_pattern: "",
});

export const UtmTab = ({ activationId, landingPageUrl }: UtmTabProps) => {
  const [configs, setConfigs] = useState<Record<string, UtmConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeChannel, setActiveChannel] = useState("default");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activationSlug, setActivationSlug] = useState("");

  useEffect(() => {
    const load = async () => {
      const [{ data: utmData }, { data: actData }] = await Promise.all([
        supabase.from("utm_configs").select("*").eq("activation_id", activationId),
        supabase.from("activations").select("slug").eq("id", activationId).single(),
      ]);
      if (actData?.slug) setActivationSlug(actData.slug);

      const map: Record<string, UtmConfig> = {};
      (utmData || []).forEach((row: any) => {
        map[row.channel || "default"] = {
          id: row.id,
          channel: row.channel || "default",
          utm_source: row.utm_source || "",
          utm_medium: row.utm_medium || "",
          utm_campaign: row.utm_campaign || "",
          utm_content: row.utm_content || "",
          utm_term: row.utm_term || "",
          use_dynamic_params: row.use_dynamic_params || false,
          dynamic_content_pattern: row.dynamic_content_pattern || "",
        };
      });
      setConfigs(map);
      setLoading(false);
    };
    load();
  }, [activationId]);

  const current = configs[activeChannel] || emptyConfig(activeChannel);

  const updateField = (field: keyof UtmConfig, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [activeChannel]: { ...current, [field]: value },
    }));
  };

  const generatedUrl = (() => {
    const base = landingPageUrl || "https://exemplo.com";
    const params = new URLSearchParams();
    if (current.utm_source) params.set("utm_source", current.utm_source);
    if (current.utm_medium) params.set("utm_medium", current.utm_medium);
    if (current.utm_campaign) params.set("utm_campaign", current.utm_campaign);
    if (current.utm_content) params.set("utm_content", current.utm_content);
    if (current.utm_term) params.set("utm_term", current.utm_term);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  })();

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      activation_id: activationId,
      channel: activeChannel,
      utm_source: current.utm_source,
      utm_medium: current.utm_medium,
      utm_campaign: current.utm_campaign,
      utm_content: current.utm_content,
      utm_term: current.utm_term,
      use_dynamic_params: current.use_dynamic_params,
      dynamic_content_pattern: current.dynamic_content_pattern,
      generated_url: generatedUrl,
    };

    if (current.id) {
      const { error } = await supabase.from("utm_configs").update(payload).eq("id", current.id);
      if (error) toast.error("Erro ao salvar UTM");
      else toast.success("UTM atualizada");
    } else {
      const { data, error } = await supabase.from("utm_configs").insert([payload]).select().single();
      if (error) toast.error("Erro ao criar UTM");
      else {
        toast.success("UTM criada");
        if (data) updateField("id" as any, data.id);
        setConfigs(prev => ({ ...prev, [activeChannel]: { ...current, id: data?.id } }));
      }
    }
    setSaving(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const isMeta = activeChannel === "meta_ads";

  const inputStyle = {
    background: "hsl(var(--bg-base))",
    border: "1px solid hsl(var(--border-strong))",
    color: "hsl(var(--text-primary))",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: 6,
  };

  const hasMacro = (val: string) => /\{\{.*?\}\}/.test(val);

  const renderMacroHighlight = (url: string) => {
    const parts = url.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) =>
      /\{\{.*?\}\}/.test(part) ? (
        <span key={i} style={{ color: "hsl(var(--accent))", fontWeight: 600 }}>{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (loading) return <div className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>Carregando...</div>;

  return (
    <div className="space-y-6">
      <SectionLabel>Configuração UTM por Canal</SectionLabel>

      {/* Channel tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ borderBottom: "1px solid hsl(var(--border-subtle))" }}>
        {CHANNELS.map(ch => {
          const isActive = activeChannel === ch.key;
          const hasConfig = !!configs[ch.key]?.id;
          return (
            <button
              key={ch.key}
              onClick={() => setActiveChannel(ch.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-label whitespace-nowrap transition-all"
              style={{
                color: isActive ? "hsl(var(--text-primary))" : "hsl(var(--text-muted))",
                borderBottom: isActive ? "2px solid hsl(var(--accent))" : "2px solid transparent",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
              }}
            >
              {ch.label}
              {hasConfig && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--accent))" }} />
              )}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Dynamic params toggle for Meta */}
        {isMeta && (
          <div
            className="flex items-center gap-3 p-3 rounded-md"
            style={{ background: "hsl(var(--accent) / 0.08)", border: "1px solid hsl(var(--accent) / 0.2)", borderRadius: 6 }}
          >
            <Zap size={16} style={{ color: "hsl(var(--accent))" }} />
            <div className="flex-1">
              <div className="text-xs font-medium" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                UTM Dinâmico com Macros Meta
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--text-muted))" }}>
                Usa placeholders como {"{{ad.name}}"} que são resolvidos pela Meta no momento do clique
              </div>
            </div>
            <button
              onClick={() => updateField("use_dynamic_params", !current.use_dynamic_params)}
              className="w-10 h-5 rounded-full transition-all relative"
              style={{
                background: current.use_dynamic_params ? "hsl(var(--accent))" : "hsl(var(--surface-3))",
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: current.use_dynamic_params ? 22 : 2 }}
              />
            </button>
          </div>
        )}

        {/* UTM Fields */}
        <div className="grid grid-cols-2 gap-4">
          {/* Source */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
              Source
            </label>
            <input
              value={current.utm_source}
              onChange={e => updateField("utm_source", e.target.value)}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
              placeholder={isMeta ? "facebook" : "google, newsletter..."}
            />
          </div>

          {/* Medium */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
              Medium
            </label>
            <input
              value={current.utm_medium}
              onChange={e => updateField("utm_medium", e.target.value)}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
              placeholder={isMeta ? "cpc" : "cpc, social, email..."}
            />
          </div>

          {/* Campaign — with macro selector for Meta */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-xs font-medium" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Campaign</label>
              {isMeta && current.use_dynamic_params && hasMacro(current.utm_campaign) && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))", fontFamily: "'JetBrains Mono'" }}>
                  Dinâmico
                </span>
              )}
            </div>
            {isMeta && current.use_dynamic_params ? (
              <div className="space-y-1.5">
                <select
                  value={META_MACROS.utm_campaign.options.find(o => o.value === current.utm_campaign)?.value ?? ""}
                  onChange={e => {
                    if (e.target.value) updateField("utm_campaign", e.target.value);
                  }}
                  className="w-full px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                >
                  {META_MACROS.utm_campaign.options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {!hasMacro(current.utm_campaign) && (
                  <input
                    value={current.utm_campaign}
                    onChange={e => updateField("utm_campaign", e.target.value)}
                    className="w-full px-3 py-2 text-xs outline-none"
                    style={inputStyle}
                    placeholder={activationSlug || "nome-da-campanha"}
                  />
                )}
              </div>
            ) : (
              <input
                value={current.utm_campaign}
                onChange={e => updateField("utm_campaign", e.target.value)}
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
                placeholder={activationSlug || "nome-da-campanha"}
              />
            )}
          </div>

          {/* Content — with macro selector for Meta */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-xs font-medium" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Content</label>
              {isMeta && current.use_dynamic_params && hasMacro(current.utm_content) && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))", fontFamily: "'JetBrains Mono'" }}>
                  Dinâmico
                </span>
              )}
            </div>
            {isMeta && current.use_dynamic_params ? (
              <div className="space-y-1.5">
                <select
                  value={META_MACROS.utm_content.options.find(o => o.value === current.utm_content)?.value ?? ""}
                  onChange={e => {
                    if (e.target.value) updateField("utm_content", e.target.value);
                  }}
                  className="w-full px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                >
                  {META_MACROS.utm_content.options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {!hasMacro(current.utm_content) && (
                  <input
                    value={current.utm_content}
                    onChange={e => updateField("utm_content", e.target.value)}
                    className="w-full px-3 py-2 text-xs outline-none"
                    style={inputStyle}
                    placeholder="banner-hero, cta-rodape..."
                  />
                )}
              </div>
            ) : (
              <input
                value={current.utm_content}
                onChange={e => updateField("utm_content", e.target.value)}
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
                placeholder="banner-hero, cta-rodape..."
              />
            )}
          </div>

          {/* Term — with macro selector for Meta */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-xs font-medium" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>Term</label>
              {isMeta && current.use_dynamic_params && hasMacro(current.utm_term) && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))", fontFamily: "'JetBrains Mono'" }}>
                  Dinâmico
                </span>
              )}
            </div>
            {isMeta && current.use_dynamic_params ? (
              <div className="space-y-1.5">
                <select
                  value={META_MACROS.utm_term.options.find(o => o.value === current.utm_term)?.value ?? ""}
                  onChange={e => {
                    if (e.target.value) updateField("utm_term", e.target.value);
                  }}
                  className="w-full px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                >
                  {META_MACROS.utm_term.options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {!hasMacro(current.utm_term) && (
                  <input
                    value={current.utm_term}
                    onChange={e => updateField("utm_term", e.target.value)}
                    className="w-full px-3 py-2 text-xs outline-none"
                    style={inputStyle}
                    placeholder="sapatos+femininos"
                  />
                )}
              </div>
            ) : (
              <input
                value={current.utm_term}
                onChange={e => updateField("utm_term", e.target.value)}
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
                placeholder="sapatos+femininos"
              />
            )}
          </div>
        </div>

        {/* Generated URL Preview */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'" }}>
            URL gerada
          </label>
          <div
            className="p-3 rounded-md text-xs break-all flex items-start gap-2"
            style={{
              background: "hsl(var(--bg-base))",
              border: "1px solid hsl(var(--border-default))",
              fontFamily: "'JetBrains Mono', monospace",
              borderRadius: 6,
              minHeight: 44,
            }}
          >
            <div className="flex-1" style={{ color: "hsl(var(--text-secondary))" }}>
              {renderMacroHighlight(generatedUrl)}
            </div>
            <button onClick={handleCopy} className="shrink-0 mt-0.5 transition-all" style={{ color: "hsl(var(--text-muted))" }}>
              {copiedUrl ? <Check size={14} style={{ color: "hsl(var(--accent))" }} /> : <Copy size={14} />}
            </button>
          </div>
          {isMeta && current.use_dynamic_params && (
            <p className="text-[10px] mt-1" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
              Os placeholders em <span style={{ color: "hsl(var(--accent))" }}>verde</span> são resolvidos pela Meta no momento do clique
            </p>
          )}
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-150 disabled:opacity-50"
            style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-inverse))", fontFamily: "'DM Sans'", borderRadius: 6 }}
          >
            {saving ? "Salvando..." : current.id ? "Atualizar UTMs" : "Salvar UTMs"}
          </button>
          {current.id && (
            <span className="text-[10px]" style={{ color: "hsl(var(--text-muted))" }}>
              ✓ Configuração salva para {CHANNELS.find(c => c.key === activeChannel)?.label}
            </span>
          )}
        </div>

        {/* Saved configs summary */}
        {Object.keys(configs).filter(k => configs[k]?.id).length > 1 && (
          <div className="mt-6">
            <SectionLabel>Links por Canal</SectionLabel>
            <div className="space-y-2 mt-3">
              {Object.entries(configs).filter(([, v]) => v.id).map(([channel, cfg]) => {
                const base = landingPageUrl || "https://exemplo.com";
                const params = new URLSearchParams();
                if (cfg.utm_source) params.set("utm_source", cfg.utm_source);
                if (cfg.utm_medium) params.set("utm_medium", cfg.utm_medium);
                if (cfg.utm_campaign) params.set("utm_campaign", cfg.utm_campaign);
                if (cfg.utm_content) params.set("utm_content", cfg.utm_content);
                if (cfg.utm_term) params.set("utm_term", cfg.utm_term);
                const url = params.toString() ? `${base}?${params.toString()}` : base;
                const chLabel = CHANNELS.find(c => c.key === channel)?.label || channel;
                return (
                  <div
                    key={channel}
                    className="flex items-center gap-3 p-2.5 rounded-md"
                    style={{ background: "hsl(var(--surface-2))", borderRadius: 6 }}
                  >
                    <span className="text-xs font-medium shrink-0 w-28" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                      {chLabel}
                    </span>
                    <span className="text-[10px] flex-1 truncate" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono'" }}>
                      {renderMacroHighlight(url)}
                    </span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(url); toast.success(`URL ${chLabel} copiada`); }}
                      className="shrink-0"
                      style={{ color: "hsl(var(--text-muted))" }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
