import { Link } from "react-router-dom";
import { Check, FileText, Image, Calendar, ClipboardList } from "lucide-react";

interface WorkflowStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  status: "done" | "active" | "pending" | "locked";
  hint?: string;
}

interface WorkflowProgressProps {
  activationId: string;
  briefDone: boolean;
  copiesApproved: number;
  copiesTotal: number;
  assetsApproved: number;
  assetsTotal: number;
  scheduledCount: number;
  activeTab: string;
}

export const WorkflowProgress = ({
  activationId,
  briefDone,
  copiesApproved,
  copiesTotal,
  assetsApproved,
  assetsTotal,
  scheduledCount,
  activeTab,
}: WorkflowProgressProps) => {
  const steps: WorkflowStep[] = [
    {
      key: "brief",
      label: "Brief",
      icon: <ClipboardList size={14} />,
      path: "brief",
      status: briefDone ? "done" : activeTab === "brief" ? "active" : "pending",
      hint: briefDone ? "Preenchido" : "Preencher brief",
    },
    {
      key: "copies",
      label: "Copies",
      icon: <FileText size={14} />,
      path: "copies",
      status: copiesApproved > 0 ? "done" : copiesTotal > 0 ? "active" : briefDone ? "pending" : "locked",
      hint: copiesApproved > 0
        ? `${copiesApproved} aprovado${copiesApproved > 1 ? "s" : ""}`
        : copiesTotal > 0
        ? `${copiesTotal} em revisão`
        : "Gerar copies",
    },
    {
      key: "assets",
      label: "Peças",
      icon: <Image size={14} />,
      path: "assets",
      status: assetsApproved > 0 ? "done" : assetsTotal > 0 ? "active" : copiesApproved > 0 ? "pending" : "locked",
      hint: assetsApproved > 0
        ? `${assetsApproved} aprovada${assetsApproved > 1 ? "s" : ""}`
        : assetsTotal > 0
        ? `${assetsTotal} em revisão`
        : "Criar peças",
    },
    {
      key: "schedule",
      label: "Agendar",
      icon: <Calendar size={14} />,
      path: "schedule",
      status: scheduledCount > 0 ? "done" : assetsApproved > 0 ? "pending" : "locked",
      hint: scheduledCount > 0 ? `${scheduledCount} agendado${scheduledCount > 1 ? "s" : ""}` : "Agendar posts",
    },
  ];

  return (
    <div
      className="flex items-center gap-0 p-3 rounded-lg mb-6"
      style={{
        background: "hsl(var(--bg-surface1))",
        border: "1px solid var(--border-default)",
        borderRadius: 8,
      }}
    >
      {steps.map((step, i) => {
        const isLocked = step.status === "locked";
        const isDone = step.status === "done";
        const isActive = step.status === "active";

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            {/* Connector line */}
            {i > 0 && (
              <div
                className="h-px flex-shrink-0"
                style={{
                  width: 24,
                  background: isDone || isActive
                    ? "hsl(var(--accent))"
                    : "hsl(var(--border-default))",
                }}
              />
            )}

            {/* Step */}
            <Link
              to={isLocked ? "#" : `/activations/${activationId}/${step.path}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all min-w-0"
              style={{
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.35 : 1,
                background: activeTab === step.key ? "hsl(var(--bg-surface3))" : "transparent",
              }}
              onClick={(e) => isLocked && e.preventDefault()}
            >
              {/* Circle */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isDone
                    ? "hsl(var(--accent))"
                    : isActive
                    ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                    : "hsl(var(--bg-surface2))",
                  border: isActive
                    ? "1px solid var(--accent)"
                    : isDone
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border-default)",
                  color: isDone
                    ? "hsl(var(--text-inverse))"
                    : isActive
                    ? "hsl(var(--accent))"
                    : "hsl(var(--text-muted))",
                }}
              >
                {isDone ? <Check size={12} /> : step.icon}
              </div>

              {/* Label + hint */}
              <div className="min-w-0">
                <span
                  className="text-xs font-medium block truncate"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    color: isDone || isActive ? "hsl(var(--text-primary))" : "hsl(var(--text-muted))",
                  }}
                >
                  {step.label}
                </span>
                {step.hint && (
                  <span
                    className="text-[9px] block truncate"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: isDone
                        ? "hsl(var(--accent))"
                        : isActive
                        ? "hsl(var(--text-secondary))"
                        : "hsl(var(--text-ghost))",
                    }}
                  >
                    {step.hint}
                  </span>
                )}
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
};
