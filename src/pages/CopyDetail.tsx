import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { CommentThread } from "@/components/ui/CommentThread";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check } from "lucide-react";

const CopyDetail = () => {
  const { id: activationId, copyId } = useParams<{ id: string; copyId: string }>();
  const navigate = useNavigate();
  const [copy, setCopy] = useState<any>(null);
  const [activation, setActivation] = useState<any>(null);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [hook, setHook] = useState("");
  const [body, setBody] = useState("");
  const [cta, setCta] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!copyId || !activationId) return;
    const fetchData = async () => {
      const [copyRes, actRes] = await Promise.all([
        supabase.from("copies").select("*").eq("id", copyId).single(),
        supabase.from("activations").select("*, clients(name)").eq("id", activationId).single(),
      ]);
      if (copyRes.data) {
        setCopy(copyRes.data);
        setHook(copyRes.data.hook || "");
        setBody(copyRes.data.body || "");
        setCta(copyRes.data.cta || "");
      }
      if (actRes.data) {
        setActivation(actRes.data);
        setClientName((actRes.data as any).clients?.name || "");
      }
      setLoading(false);
    };
    fetchData();
  }, [copyId, activationId]);

  const updateCopy = async (updates: Record<string, any>) => {
    setSaving(true);
    const fullCopy = `${updates.hook ?? hook}\n\n${updates.body ?? body}\n\n${updates.cta ?? cta}`;
    await supabase.from("copies").update({ ...updates, full_copy: fullCopy }).eq("id", copyId!);
    const { data } = await supabase.from("copies").select("*").eq("id", copyId!).single();
    if (data) {
      setCopy(data);
      setHook(data.hook || "");
      setBody(data.body || "");
      setCta(data.cta || "");
    }
    setSaving(false);
  };

  const handleSave = () => updateCopy({ hook, body, cta });
  const handleApproveAll = () => updateCopy({ hook, body, cta, status: "approved" });
  const handleReject = () => updateCopy({ status: "rejected" });
  const handleSendToReview = () => updateCopy({ hook, body, cta, status: "review" });

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</div>
      </AppLayout>
    );
  }

  if (!copy) {
    return (
      <AppLayout breadcrumbs={[{ label: "Copy não encontrado" }]}>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Copy não encontrado</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName, href: `/clients/${activation?.client_id}` },
        { label: activation?.name || "...", href: `/activations/${activationId}/copies` },
        { label: `Copy v${copy.version}` },
      ]}
    >
      {/* Back + Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/activations/${activationId}/copies`)}
          className="p-2 rounded-md transition-all duration-150"
          style={{ background: "var(--bg-surface2)", color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
              Copy v{copy.version}
            </h1>
            <StatusBadge status={copy.status} />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
              {copy.type} · {copy.channel || "—"} · {copy.funnel_stage || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main — 70% */}
        <div className="flex-1 space-y-4" style={{ minWidth: 0 }}>
          <CopyBlock
            label="Gancho"
            content={hook}
            onChange={setHook}
            onApprove={() => {}}
            onReject={() => {}}
            onRegenerate={() => {}}
          />

          <CopyBlock
            label="Corpo"
            content={body}
            onChange={setBody}
            onApprove={() => {}}
            onReject={() => {}}
            onRegenerate={() => {}}
          />

          <CopyBlock
            label="CTA"
            content={cta}
            onChange={setCta}
            onApprove={() => {}}
            onReject={() => {}}
            onRegenerate={() => {}}
          />

          {/* LP Override */}
          {copy.landing_page_url && (
            <div className="p-4 rounded-lg" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
              <SectionLabel>Landing Page</SectionLabel>
              <p className="text-xs mt-2 break-all" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>
                {copy.landing_page_url}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium rounded-md transition-all duration-150 disabled:opacity-50"
              style={{ background: "var(--bg-surface2)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "'DM Sans'", borderRadius: 6 }}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            {copy.status === "draft" && (
              <button
                onClick={handleSendToReview}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-all duration-150 disabled:opacity-50"
                style={{
                  background: "color-mix(in srgb, var(--status-review) 15%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--status-review) 30%, transparent)",
                  color: "var(--status-review)",
                  fontFamily: "'DM Sans'",
                  borderRadius: 6,
                }}
              >
                Enviar para revisão
              </button>
            )}

            {(copy.status === "review" || copy.status === "draft") && (
              <button
                onClick={handleApproveAll}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md transition-all duration-150 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--text-inverse)", fontFamily: "'DM Sans'", borderRadius: 6 }}
              >
                <Check size={14} /> Aprovar copy completo
              </button>
            )}

            {copy.status === "review" && (
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-all duration-150 disabled:opacity-50"
                style={{
                  background: "color-mix(in srgb, var(--status-rejected) 15%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--status-rejected) 30%, transparent)",
                  color: "var(--status-rejected)",
                  fontFamily: "'DM Sans'",
                  borderRadius: 6,
                }}
              >
                Rejeitar
              </button>
            )}
          </div>
        </div>

        {/* Sidebar — 30% */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-6">
          <CommentThread entityType="copy" entityId={copyId!} />

          {/* Version History */}
          <div>
            <SectionLabel>Versões</SectionLabel>
            <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "var(--accent)", color: "var(--text-inverse)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {copy.version}
                </span>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans'" }}>
                    Versão atual
                  </p>
                  <p className="text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                    {new Date(copy.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CopyDetail;
