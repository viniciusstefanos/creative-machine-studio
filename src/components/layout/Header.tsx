import { Link } from "react-router-dom";
import { Bell, ChevronRight } from "lucide-react";

interface HeaderProps {
  breadcrumbs?: { label: string; href?: string }[];
}

export const Header = ({ breadcrumbs = [] }: HeaderProps) => {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-8 py-3"
      style={{
        background: "var(--bg-surface1)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />}
            {crumb.href ? (
              <Link
                to={crumb.href}
                className="text-[10px] uppercase tracking-[2px] transition-colors duration-150 hover:opacity-80"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text-muted)",
                }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className="text-[10px] uppercase tracking-[2px]"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text-secondary)",
                }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Notifications */}
      <Link
        to="/notifications"
        className="p-2 rounded-md transition-all duration-150"
        style={{ color: "var(--text-muted)" }}
      >
        <Bell size={18} />
      </Link>
    </header>
  );
};
