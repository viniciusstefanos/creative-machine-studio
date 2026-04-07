import { ReactNode } from "react";

interface SectionLabelProps {
  children: ReactNode;
}

export const SectionLabel = ({ children }: SectionLabelProps) => (
  <span
    className="text-[9px] uppercase tracking-[4px] font-medium"
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      color: "hsl(var(--accent))",
    }}
  >
    {children}
  </span>
);
