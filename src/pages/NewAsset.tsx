import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronRight, Loader2, Sparkles } from "lucide-react";

const NewAsset = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [copies, setCopies] = useState<any[]>([]);
  const [formats, setFormats] = useState<any[]>([]);
  const [selectedCopy, setSelectedCopy] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activation, setActivation] = useState<any>(null);
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [copiesRes, formatsRes, actRes] = await Promise.all([
        supabase.from("copies").select("*").eq("activation_id", id).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.from("asset_formats").select("*").eq("active", true).order("category"),
        supabase.from("activations").select("*, clients(name)").eq("id", id).single(),
      ]);
      setCopies(copiesRes.data || []);
      setFormats(formatsRes.data || []);
      if (actRes.data) {
        setActivation(actRes.data);
        setClientName((actRes.data as any).clients?.name || "");
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleGenerate = async () => {
    if (!selectedCopy || !selectedFormat || !id) return;
    setGenerating(true);

    const selectedFormatData = formats.find((f) => f.id === selectedFormat);
    const { data: asset, error: insertError } = await supabase
      .from("assets")
      .insert({
        activation_id: id,
        copy_id: selectedCopy,
        format_id: selectedFormat,
        status: "generating",
        category: selectedFormatData?.category || null,
      })
      .select()
      .single();

    if (insertError || !asset) {
      toast({ title: "Erro", description: "Falha ao criar asset", variant: "destructive" });
      setGenerating(false);
      return;
    }

    supabase.functions
      .invoke("generate-asset", {
        body: { asset_id: asset.id, activation_id: id, copy_id: selectedCopy, format_id: selectedFormat },
      })
      .catch((err) => console.error("generate-asset invoke error:", err));

    navigate(`/activations/${id}/assets/${asset.id}`);
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: "..." }]}>
        <div className="text-sm text-txt-muted">Carregando...</div>
      </AppLayout>
    );
  }

  const stepLabels = ["Selecionar Copy", "Selecionar Formato", "Gerar"];

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        { label: clientName, href: `/clients/${activation?.client_id}` },
        { label: activation?.name || "", href: `/activations/${id}/assets` },
        { label: "Nova Peça" },
      ]}
    >
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
        Nova Peça Visual
      </h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={14} className="text-txt-ghost" />}
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    background: isDone ? "var(--accent)" : isActive ? "var(--accent-dim)" : "var(--bg-surface2)",
                    color: isDone || isActive ? "var(--bg-base)" : "var(--text-muted)",
                    border: isActive ? "1px solid var(--accent)" : "1px solid transparent",
                  }}
                >
                  {isDone ? <Check size={14} /> : stepNum}
                </div>
                <span
                  className="text-xs"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Select Copy */}
      {step === 1 && (
        <div>
          <SectionLabel>Copies Aprovados</SectionLabel>
          {copies.length === 0 ? (
            <div className="p-8 rounded-lg text-center mt-4 bg-surface-1 border border-line-subtle" style={{ borderRadius: 8 }}>
              <p className="text-sm text-txt-muted" style={{ fontFamily: "'DM Sans'" }}>
                Nenhum copy aprovado. Aprove um copy antes de criar uma peça.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 mt-4">
              {copies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCopy(c.id); setStep(2); }}
                  className="p-4 rounded-lg text-left transition-all duration-150 hover:bg-surface-2"
                  style={{
                    background: selectedCopy === c.id ? "var(--accent-surface)" : "var(--bg-surface1)",
                    border: selectedCopy === c.id ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                    borderRadius: 8,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                      {c.type} · {c.channel} · v{c.version}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-sm line-clamp-2" style={{ fontFamily: "'DM Sans'", color: "var(--text-primary)" }}>
                    {c.hook || c.body || "Sem conteúdo"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Format */}
      {step === 2 && (
        <div>
          <SectionLabel>Formatos Disponíveis</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {formats.map((f) => (
              <button
                key={f.id}
                onClick={() => { setSelectedFormat(f.id); setStep(3); }}
                className="p-4 rounded-lg text-left transition-all duration-150 hover:bg-surface-2"
                style={{
                  background: selectedFormat === f.id ? "var(--accent-surface)" : "var(--bg-surface1)",
                  border: selectedFormat === f.id ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                  borderRadius: 8,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium" style={{ fontFamily: "'DM Sans'", color: "var(--text-primary)" }}>
                    {f.name}
                  </span>
                  <span
                    className="text-[9px] uppercase px-1.5 py-0.5 rounded"
                    style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--bg-surface3)", color: "var(--text-secondary)" }}
                  >
                    {f.category}
                  </span>
                </div>
                {f.prompt_hint && (
                  <p className="text-xs text-txt-ghost line-clamp-2" style={{ fontFamily: "'DM Sans'" }}>
                    {f.prompt_hint}
                  </p>
                )}
              </button>
            ))}
          </div>
          <Button variant="ghost" className="mt-4" onClick={() => setStep(1)}>
            ← Voltar
          </Button>
        </div>
      )}

      {/* Step 3: Confirm & Generate */}
      {step === 3 && (
        <div>
          <SectionLabel>Confirmar e Gerar</SectionLabel>
          <div className="mt-4 p-6 rounded-lg bg-surface-1 border border-line-subtle" style={{ borderRadius: 8 }}>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-txt-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Copy selecionado
                </span>
                <p className="text-sm text-txt-primary mt-1 line-clamp-2" style={{ fontFamily: "'DM Sans'" }}>
                  {copies.find((c) => c.id === selectedCopy)?.hook || "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-txt-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Formato
                </span>
                <p className="text-sm text-txt-primary mt-1" style={{ fontFamily: "'DM Sans'" }}>
                  {formats.find((f) => f.id === selectedFormat)?.name || "—"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setStep(2)}>← Voltar</Button>
              <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? "Gerando..." : "Gerar peça com IA"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default NewAsset;
