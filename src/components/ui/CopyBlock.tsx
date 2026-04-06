import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Check, X, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";

interface CopyBlockProps {
  label: string;
  content: string;
  status?: string;
  onApprove?: () => void;
  onReject?: (feedback?: string) => void;
  onRegenerate?: (feedback?: string) => void;
  onChange?: (value: string) => void;
  editable?: boolean;
  regenerating?: boolean;
}

export const CopyBlock = ({
  label,
  content,
  status,
  onApprove,
  onReject,
  onRegenerate,
  onChange,
  editable = true,
  regenerating = false,
}: CopyBlockProps) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackAction, setFeedbackAction] = useState<"reject" | "regenerate">("reject");

  const handleFeedbackSubmit = () => {
    if (feedbackAction === "reject") {
      onReject?.(feedback);
    } else {
      onRegenerate?.(feedback);
    }
    setShowFeedback(false);
    setFeedback("");
  };

  return (
    <div
      className="p-5 rounded-lg"
      style={{
        background: "var(--bg-surface1)",
        border: "1px solid var(--border-default)",
        borderRadius: 8,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>{label}</SectionLabel>
        {status && <StatusBadge status={status} />}
      </div>

      {editable ? (
        <textarea
          value={content}
          onChange={(e) => onChange?.(e.target.value)}
          rows={label === "Corpo" ? 6 : 3}
          className="w-full px-3 py-2.5 text-sm outline-none resize-none transition-all duration-150"
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-primary)",
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: 6,
          }}
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans'" }}>
          {content || "—"}
        </p>
      )}

      {/* Feedback input */}
      {showFeedback && (
        <div className="mt-3 space-y-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            placeholder={feedbackAction === "reject" ? "Motivo da rejeição..." : "O que melhorar neste bloco..."}
            className="w-full px-3 py-2 text-xs outline-none resize-none transition-all duration-150"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-primary)",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 6,
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleFeedbackSubmit}
              className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150"
              style={{ background: "var(--accent)", color: "var(--text-inverse)", fontFamily: "'DM Sans'", borderRadius: 6 }}
            >
              {feedbackAction === "reject" ? "Rejeitar" : "Regenerar"}
            </button>
            <button
              onClick={() => { setShowFeedback(false); setFeedback(""); }}
              className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150"
              style={{ background: "var(--bg-surface2)", color: "var(--text-muted)", fontFamily: "'DM Sans'", borderRadius: 6 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {onApprove && (
          <button
            onClick={onApprove}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150"
            style={{
              background: "color-mix(in srgb, var(--status-approved) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--status-approved) 30%, transparent)",
              color: "var(--status-approved)",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
            }}
          >
            <Check size={12} /> Aprovar
          </button>
        )}
        {onReject && (
          <button
            onClick={() => { setFeedbackAction("reject"); setShowFeedback(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150"
            style={{
              background: "color-mix(in srgb, var(--status-rejected) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--status-rejected) 30%, transparent)",
              color: "var(--status-rejected)",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
            }}
          >
            <X size={12} /> Rejeitar
          </button>
        )}
        {onRegenerate && (
          <button
            onClick={() => { setFeedbackAction("regenerate"); setShowFeedback(true); }}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 disabled:opacity-50"
            style={{
              background: "var(--bg-surface2)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-secondary)",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
            }}
          >
            {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Regenerar
          </button>
        )}
      </div>
    </div>
  );
};
