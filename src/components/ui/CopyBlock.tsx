import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Check, X, RefreshCw } from "lucide-react";

interface CopyBlockProps {
  label: string;
  content: string;
  status?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onRegenerate?: () => void;
  onChange?: (value: string) => void;
  editable?: boolean;
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
}: CopyBlockProps) => {
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
            onClick={onReject}
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
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150"
            style={{
              background: "var(--bg-surface2)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-secondary)",
              fontFamily: "'DM Sans'",
              borderRadius: 6,
            }}
          >
            <RefreshCw size={12} /> Regenerar
          </button>
        )}
      </div>
    </div>
  );
};
