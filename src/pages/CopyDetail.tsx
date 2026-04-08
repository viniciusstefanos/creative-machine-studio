import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { CommentThread } from "@/components/ui/CommentThread";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { NextStepBar } from "@/components/activation/NextStepBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Check, Send, X, Copy, Loader2, Trash2 } from "lucide-react";

const purposeLabel: Record<string, string> = { organic: "Orgânico", ads: "Ads" };
const purposeColor: Record<string, string> = { organic: "--status-published", ads: "--accent" };

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
  const [creatingVariation, setCreatingVariation] = useState(false);
  const [workflowData, setWorkflowData] = useState({ briefDone: false, copiesApproved: 0, assetsApproved: 0, scheduledCount: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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

      const [briefRes, copiesApprovedRes, assetsApprovedRes, scheduledRes] = await Promise.all([
        supabase.from("briefs").select("objectives").eq("activation_id", activationId).single(),
        supabase.from("copies").select("id", { count: "exact" }).eq("activation_id", activationId).eq("status", "approved"),
        supabase.from("assets").select("id", { count: "exact" }).eq("activation_id", activationId).eq("status", "approved"),
        supabase.from("scheduled_posts").select("id", { count: "exact" }).eq("activation_id", activationId),
      ]);
      setWorkflowData({
        briefDone: !!(briefRes.data?.objectives),
        copiesApproved: copiesApprovedRes.count || 0,
        assetsApproved: assetsApprovedRes.count || 0,
        scheduledCount: scheduledRes.count || 0,
      });

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

    if (updates.status === "approved") {
      toast.success("Copy aprovado!", {
        description: "Agora crie peças visuais com este copy.",
        action: { label: "Criar peça →", onClick: () => navigate(`/activations/${activationId}/assets/new`) },
      });
    } else if (updates.status === "rejected") {
      toast("Copy rejeitado", {
        description: "Volte para a lista de copies.",
        action: { label: "Ver copies", onClick: () => navigate(`/activations/${activationId}/copies`) },
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Excluir este copy permanentemente?")) return;
    await supabase.from("assets").update({ copy_id: null }).eq("copy_id", copyId!);
    const { error } = await supabase.from("copies").delete().eq("id", copyId!);
    if (error) {
      toast.error("Erro ao excluir copy");
    } else {
      toast.success("Copy excluído");
      navigate(`/activations/${activationId}/copies`);
    }
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
          purpose: copy?.purpose || "organic",
        },
      });

      if (error) throw error;
      if (data?.content) {
        if (block === "hook") setHook(data.content);
        else if (block === "body") setBody(data.content);
        else setCta(data.content);
        toast.success(`${block === "hook" ? "Gancho" : block === "body" ? "Corpo" : "CTA"} regenerado`);
      }
    } catch (err) {
      console.error("Regenerate error:", err);
      toast.error("Erro ao regenerar. Tente novamente.");
    }
    setRegeneratingBlock(null);
  };

  const handleCreateVariation = async () => {
    if (!copy) return;
    setCreatingVariation(true);
    const newPurpose = (copy.purpose || "organic") === "organic" ? "ads" : "organic";
    try {
      const { data, error } = await supabase.from("copies").insert([{
        activation_id: activationId,
        hook: copy.hook,
        body: copy.body,
        cta: copy.cta,
        full_copy: copy.full_copy,
        type: copy.type,
        channel: copy.channel,
        funnel_stage: copy.funnel_stage,
        purpose: newPurpose,
        status: "draft",
      }]).select().single();

      if (error) throw error;
      toast.success(`Variação ${purposeLabel[newPurpose]} criada!`, {
        description: "Abra para editar e adaptar o tom.",
        action: { label: "Abrir →", onClick: () => navigate(`/activations/${activationId}/copies/${data.id}`) },
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar variação.");
    }
    setCreatingVariation(false);
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

  const currentPurpose = copy.purpose || "organic";
  const oppositePurpose = currentPurpose === "organic" ? "ads" : "organic";

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName, href: `/clients/${activation?.client_id}` },
        { label: activation?.name || "...", href: `/activations/${activationId}/copies` },
        { label: `Copy v${copy.version}` },
      ]}
    >
      <NextStepBar
        activationId={activationId!}
        currentStep="copies"
        briefDone={workflowData.briefDone}
        copiesApproved={workflowData.copiesApproved}
        assetsApproved={workflowData.assetsApproved}
        scheduledCount={workflowData.scheduledCount}
      />

      <div className="grid gap-0" style={{ gridTemplateColumns: "1fr 300px", minHeight: "calc(100vh - 180px)" }}>
        {/* Main Content */}
        <div className="pr-8 space-y-4" style={{ borderRight: "1px solid hsl(var(--border-subtle))" }}>
          {/* Header */}
          <div className="pb-5 mb-6" style={{ borderBottom: "1px solid hsl(var(--border-subtle))" }}>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/activations/${activationId}/copies`)}>
                <ArrowLeft size={16} />
              </Button>
              <h1 className="text-display-md">Copy v{copy.version}</h1>
              <StatusBadge status={copy.status} />
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: `hsl(var(${purposeColor[currentPurpose]}) / 0.12)`,
                  color: `hsl(var(${purposeColor[currentPurpose]}))`,
                  border: `1px solid hsl(var(${purposeColor[currentPurpose]}) / 0.25)`,
                }}
              >
                {currentPurpose === "organic" ? "🌱 ORG" : "📢 ADS"}
              </span>
            </div>
            <div className="pl-11 flex items-center gap-3">
              <span className="text-mono-label">
                {copy.type} · {copy.channel || "—"} · {copy.funnel_stage || "—"}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7 text-[11px]"
                onClick={handleCreateVariation}
                disabled={creatingVariation}
              >
                {creatingVariation ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                Criar variação {purposeLabel[oppositePurpose]}
              </Button>
            </div>
          </div>

          {/* Copy Blocks */}
          <CopyBlock label="Gancho" content={hook} status={copy.status} onChange={setHook} onApprove={() => {}} onReject={(fb) => handleRegenerate("hook", fb)} onRegenerate={(fb) => handleRegenerate("hook", fb)} regenerating={regeneratingBlock === "hook"} />
          <CopyBlock label="Corpo" content={body} status={copy.status} onChange={setBody} onApprove={() => {}} onReject={(fb) => handleRegenerate("body", fb)} onRegenerate={(fb) => handleRegenerate("body", fb)} regenerating={regeneratingBlock === "body"} />
          <CopyBlock label="CTA" content={cta} status={copy.status} onChange={setCta} onApprove={() => {}} onReject={(fb) => handleRegenerate("cta", fb)} onRegenerate={(fb) => handleRegenerate("cta", fb)} regenerating={regeneratingBlock === "cta"} />

          {copy.landing_page_url && (
            <div className="card-base">
              <SectionLabel>Landing Page</SectionLabel>
              <p className="text-mono mt-2 break-all" style={{ color: "hsl(var(--accent))" }}>{copy.landing_page_url}</p>
            </div>
          )}

          {/* Sticky footer */}
          <div className="form__footer sticky bottom-0" style={{ background: "hsl(var(--bg-base))", paddingBottom: 20 }}>
            <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-1.5 text-destructive/70 hover:text-destructive">
              <Trash2 size={14} /> Excluir
            </Button>
            {copy.status === "review" && (
              <Button variant="destructive" size="sm" onClick={handleReject} disabled={saving} className="gap-2">
                <X size={14} /> Rejeitar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
            {copy.status === "draft" && (
              <Button variant="secondary" size="sm" onClick={handleSendToReview} disabled={saving} className="gap-2">
                <Send size={14} /> Enviar para revisão
              </Button>
            )}
            {(copy.status === "review" || copy.status === "draft") && (
              <Button size="sm" onClick={handleApproveAll} disabled={saving} className="gap-2">
                <Check size={14} /> Aprovar copy completo
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="pl-6 space-y-6" style={{ background: "hsl(var(--bg-surface1))", padding: "24px 20px" }}>
          {/* Purpose selector */}
          <div>
            <SectionLabel>Finalidade</SectionLabel>
            <select
              className="field-input mt-2"
              value={currentPurpose}
              onChange={(e) => updateCopy({ purpose: e.target.value })}
            >
              <option value="organic">🌱 Orgânico</option>
              <option value="ads">📢 Ads</option>
            </select>
          </div>

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
                  <p className="text-body-sm" style={{ color: "hsl(var(--text-primary))" }}>Versão atual</p>
                  <p className="text-mono" style={{ color: "hsl(var(--text-muted))" }}>
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
