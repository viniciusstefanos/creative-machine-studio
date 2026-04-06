import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { CommentThread } from "@/components/ui/CommentThread";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  const [regeneratingBlock, setRegeneratingBlock] = useState<string | null>(null);

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

  const handleRegenerate = async (block: string, feedback?: string) => {
    setRegeneratingBlock(block);
    try {
      const { data: briefData } = await supabase
        .from("briefs")
        .select("tone_of_voice, target_audience, objectives")
        .eq("activation_id", activationId!)
        .single();

      const briefContext = briefData
        ? `Tom: ${briefData.tone_of_voice || ""}. Público: ${briefData.target_audience || ""}. Objetivos: ${briefData.objectives || ""}`
        : "";

      const currentContent = block === "hook" ? hook : block === "body" ? body : cta;

      const { data, error } = await supabase.functions.invoke("regenerate-copy-block", {
        body: {
          block,
          current_content: currentContent,
          feedback: feedback || "",
          brief_context: briefContext,
          channel: copy?.channel,
          funnel_stage: copy?.funnel_stage,
        },
      });

      if (error) throw error;
      if (data?.content) {
        if (block === "hook") setHook(data.content);
        else if (block === "body") setBody(data.content);
        else setCta(data.content);
        toast({ title: `${block === "hook" ? "Gancho" : block === "body" ? "Corpo" : "CTA"} regenerado` });
      }
    } catch (err) {
      console.error("Regenerate error:", err);
      toast({ title: "Erro ao regenerar", description: "Tente novamente.", variant: "destructive" });
    }
    setRegeneratingBlock(null);
  };

  const handleSave = () => updateCopy({ hook, body, cta });
  const handleApproveAll = () => updateCopy({ hook, body, cta, status: "approved" });
  const handleReject = () => updateCopy({ status: "rejected" });
  const handleSendToReview = () => updateCopy({ hook, body, cta, status: "review" });

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <div className="text-caption">Carregando...</div>
      </AppLayout>
    );
  }

  if (!copy) {
    return (
      <AppLayout breadcrumbs={[{ label: "Copy não encontrado" }]}>
        <div className="text-caption">Copy não encontrado</div>
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
      <div
        className="grid gap-0"
        style={{
          gridTemplateColumns: "1fr 300px",
          minHeight: "calc(100vh - 120px)",
        }}
      >
        {/* ── Main Content ── */}
        <div
          className="pr-8 space-y-4"
          style={{ borderRight: "1px solid hsl(var(--border-subtle))" }}
        >
          {/* Header */}
          <div
            className="pb-5 mb-6"
            style={{ borderBottom: "1px solid hsl(var(--border-subtle))" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate(`/activations/${activationId}/copies`)}
                className="p-2 rounded-md transition-all"
                style={{ background: "hsl(var(--bg-surface2))", color: "hsl(var(--text-muted))" }}
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="text-display-md">Copy v{copy.version}</h1>
              <StatusBadge status={copy.status} />
            </div>
            <div className="pl-10">
              <span
                className="text-[10px] uppercase tracking-[2px]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}
              >
                {copy.type} · {copy.channel || "—"} · {copy.funnel_stage || "—"}
              </span>
            </div>
          </div>

          {/* Copy Blocks */}
          <CopyBlock
            label="Gancho"
            content={hook}
            status={copy.status}
            onChange={setHook}
            onApprove={() => {}}
            onReject={(fb) => handleRegenerate("hook", fb)}
            onRegenerate={(fb) => handleRegenerate("hook", fb)}
            regenerating={regeneratingBlock === "hook"}
          />
          <CopyBlock
            label="Corpo"
            content={body}
            status={copy.status}
            onChange={setBody}
            onApprove={() => {}}
            onReject={(fb) => handleRegenerate("body", fb)}
            onRegenerate={(fb) => handleRegenerate("body", fb)}
            regenerating={regeneratingBlock === "body"}
          />
          <CopyBlock
            label="CTA"
            content={cta}
            status={copy.status}
            onChange={setCta}
            onApprove={() => {}}
            onReject={(fb) => handleRegenerate("cta", fb)}
            onRegenerate={(fb) => handleRegenerate("cta", fb)}
            regenerating={regeneratingBlock === "cta"}
          />

          {copy.landing_page_url && (
            <div className="card-base">
              <SectionLabel>Landing Page</SectionLabel>
              <p className="text-xs mt-2 break-all" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--accent))" }}>
                {copy.landing_page_url}
              </p>
            </div>
          )}

          {/* Sticky footer */}
          <div
            className="flex justify-end gap-2 pt-5 mt-6 sticky bottom-0"
            style={{
              borderTop: "1px solid hsl(var(--border-subtle))",
              background: "hsl(var(--bg-base))",
              paddingBottom: 20,
            }}
          >
            {copy.status === "review" && (
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-4 py-2 text-xs font-medium rounded-md transition-all disabled:opacity-50"
                style={{
                  background: "color-mix(in srgb, hsl(var(--status-rejected)) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, hsl(var(--status-rejected)) 30%, transparent)",
                  color: "hsl(var(--status-rejected))",
                  fontFamily: "'DM Sans'",
                  borderRadius: 6,
                }}
              >
                Rejeitar copy
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium rounded-md transition-all disabled:opacity-50"
              style={{
                background: "hsl(var(--bg-surface2))",
                border: "1px solid hsl(var(--border-strong))",
                color: "hsl(var(--text-primary))",
                fontFamily: "'DM Sans'",
                borderRadius: 6,
              }}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
            {copy.status === "draft" && (
              <button
                onClick={handleSendToReview}
                disabled={saving}
                className="px-4 py-2 text-xs font-medium rounded-md transition-all disabled:opacity-50"
                style={{
                  background: "color-mix(in srgb, hsl(var(--status-review)) 15%, transparent)",
                  border: "1px solid color-mix(in srgb, hsl(var(--status-review)) 30%, transparent)",
                  color: "hsl(var(--status-review))",
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
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-all disabled:opacity-50"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--text-inverse))",
                  fontFamily: "'DM Sans'",
                  borderRadius: 6,
                }}
              >
                <Check size={14} /> Aprovar copy completo
              </button>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div
          className="pl-6 space-y-6"
          style={{ background: "hsl(var(--bg-surface1))", padding: "24px 20px" }}
        >
          <CommentThread entityType="copy" entityId={copyId!} />

          <div>
            <SectionLabel>Versões</SectionLabel>
            <div className="mt-3 card-base">
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: "hsl(var(--accent))",
                    color: "hsl(var(--text-inverse))",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {copy.version}
                </span>
                <div>
                  <p className="text-xs" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>Versão atual</p>
                  <p className="text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
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
