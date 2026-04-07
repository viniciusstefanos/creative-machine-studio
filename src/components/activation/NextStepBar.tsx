import { Link } from "react-router-dom";
import { ArrowRight, Check, FileText, Image, Calendar, ClipboardList } from "lucide-react";

interface NextStepBarProps {
  activationId: string;
  currentStep: "brief" | "copies" | "assets" | "schedule";
  briefDone?: boolean;
  copiesApproved?: number;
  assetsApproved?: number;
  scheduledCount?: number;
}

const steps = [
  { key: "brief", label: "Brief", icon: ClipboardList },
  { key: "copies", label: "Copies", icon: FileText },
  { key: "assets", label: "Peças", icon: Image },
  { key: "schedule", label: "Agendar", icon: Calendar },
] as const;

export const NextStepBar = ({
  activationId,
  currentStep,
  briefDone,
  copiesApproved = 0,
  assetsApproved = 0,
  scheduledCount = 0,
}: NextStepBarProps) => {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  const getStepStatus = (key: string): "done" | "active" | "pending" => {
    if (key === "brief") return briefDone ? "done" : "pending";
    if (key === "copies") return copiesApproved > 0 ? "done" : "pending";
    if (key === "assets") return assetsApproved > 0 ? "done" : "pending";
    if (key === "schedule") return scheduledCount > 0 ? "done" : "pending";
    return "pending";
  };

  // Determine next suggested action
  const nextStep = steps[currentIndex + 1];
  const nextStepPath = nextStep ? `/activations/${activationId}/${nextStep.key}` : null;
  const nextStepLabel = nextStep
    ? `Próximo: ${nextStep.label}`
    : null;

  return (
    <div className="card-base flex items-center justify-between gap-4 mb-5">
      {/* Mini workflow dots */}
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const status = getStepStatus(step.key);
          const isCurrent = step.key === currentStep;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center gap-1">
              {i > 0 && (
                <div
                  className="h-px w-4"
                  style={{
                    background: status === "done"
                      ? "hsl(var(--accent))"
                      : "hsl(var(--border-default))",
                  }}
                />
              )}
              <Link
                to={`/activations/${activationId}/${step.key}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all"
                style={{
                  background: isCurrent ? "hsl(var(--bg-surface3))" : "transparent",
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: status === "done"
                      ? "hsl(var(--accent))"
                      : isCurrent
                      ? "hsl(var(--accent) / 0.15)"
                      : "hsl(var(--bg-surface2))",
                    border: isCurrent
                      ? "1px solid hsl(var(--accent))"
                      : status === "done"
                      ? "1px solid hsl(var(--accent))"
                      : "1px solid hsl(var(--border-default))",
                    color: status === "done"
                      ? "hsl(var(--text-inverse))"
                      : isCurrent
                      ? "hsl(var(--accent))"
                      : "hsl(var(--text-muted))",
                  }}
                >
                  {status === "done" ? <Check size={10} /> : <Icon size={10} />}
                </div>
                <span
                  className="text-[10px] font-medium hidden sm:inline"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    color: isCurrent || status === "done"
                      ? "hsl(var(--text-primary))"
                      : "hsl(var(--text-muted))",
                  }}
                >
                  {step.label}
                </span>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Next step CTA */}
      {nextStepPath && nextStepLabel && (
        <Link
          to={nextStepPath}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={{
            background: "hsl(var(--accent) / 0.1)",
            color: "hsl(var(--accent))",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {nextStepLabel}
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
};
