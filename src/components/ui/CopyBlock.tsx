import { StatusBadge } from "@/components/ui/StatusBadge";
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

const statusBorderMap: Record<string, string> = {
  review: "color-mix(in srgb, hsl(var(--status-review)) 40%, transparent)",
  approved: "color-mix(in srgb, hsl(var(--status-approved)) 30%, transparent)",
  rejected: "color-mix(in srgb, hsl(var(--status-rejected)) 30%, transparent)",
};

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

  const borderColor = status && statusBorderMap[status]
    ? statusBorderMap[status]
    : "hsl(var(--border-default))";

  return (
    <div
      className="p-4 rounded-lg transition-all"
      style={{
        background: "hsl(var(--bg-surface1))",
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[9px] uppercase tracking-[3px]"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "hsl(var(--text-muted))",
          }}
        >
          {label}
        </span>
        {status && <StatusBadge status={status} />}
      </div>

      {/* Content */}
      {editable ? (
        <textarea
          value={content}
          onChange={(e) => onChange?.(e.target.value)}
          rows={label === "Corpo" ? 6 : 3}
          className="w-full px-3 py-2.5 text-[13px] leading-[1.7] outline-none resize-none transition-all"
          style={{
            background: "hsl(var(--bg-base))",
            border: "1px solid hsl(var(--border-strong))",
            color: "hsl(var(--text-primary))",
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: 6,
          }}
        />
      ) : (
        <p
          className="text-[13px] leading-[1.7] whitespace-pre-wrap"
          style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}
        >
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
            className="w-full px-3 py-2 text-xs outline-none resize-none"
            style={{
              background: "hsl(var(--bg-base))",
              border: "1px solid hsl(var(--border-strong))",
              color: "hsl(var(--text-primary))",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 6,
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleFeedbackSubmit}
              className="px-3 py-1.5 text-[11px] font-medium rounded-md"
              style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-inverse))", fontFamily: "'DM Sans'", borderRadius: 6 }}
            >
              {feedbackAction === "reject" ? "Rejeitar" : "Regenerar"}
            </button>
            <button
              onClick={() => { setShowFeedback(false); setFeedback(""); }}
              className="px-3 py-1.5 text-[11px] font-medium rounded-md"
              style={{ background: "hsl(var(--bg-surface2))", color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'", borderRadius: 6 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Actions — separated by border */}
      {(onApprove || onReject || onRegenerate) && (
        <div
          className="flex items-center gap-2 pt-3 mt-3"
          style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}
        >
          {onApprove && (
            <button
              onClick={onApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all"
              style={{
                background: "color-mix(in srgb, hsl(var(--status-approved)) 10%, transparent)",
                border: "1px solid color-mix(in srgb, hsl(var(--status-approved)) 25%, transparent)",
                color: "hsl(var(--status-approved))",
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all hover:bg-[color-mix(in_srgb,hsl(var(--status-rejected))_10%,transparent)]"
              style={{
                background: "transparent",
                border: "1px solid transparent",
                color: "hsl(var(--status-rejected))",
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
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md transition-all disabled:opacity-50 ml-auto"
              style={{
                background: "transparent",
                color: "hsl(var(--text-muted))",
                fontFamily: "'DM Sans'",
                borderRadius: 6,
              }}
            >
              {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Regenerar
            </button>
          )}
        </div>
      )}
    </div>
  );
};
