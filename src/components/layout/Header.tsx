import { Link } from "react-router-dom";
import { Bell, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  breadcrumbs?: { label: string; href?: string }[];
}

export const Header = ({ breadcrumbs = [] }: HeaderProps) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecent(data || []);
    };
    fetchNotifs();
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setRecent((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-8 py-3"
      style={{
        background: "hsl(var(--bg-surface1)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-1.5 pl-10 md:pl-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} style={{ color: "hsl(var(--text-muted)" }} />}
            {crumb.href ? (
              <Link
                to={crumb.href}
                className="text-[10px] uppercase tracking-[2px] transition-colors duration-150 hover:opacity-80"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted)" }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className="text-[10px] uppercase tracking-[2px]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-secondary)" }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 rounded-md transition-all duration-150 relative"
          style={{ color: "hsl(var(--text-muted)" }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center"
              style={{
                background: "hsl(var(--status-rejected)",
                color: "hsl(var(--text-primary)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <div
            className="absolute right-0 top-full mt-2 w-80 rounded-lg overflow-hidden shadow-lg z-50"
            style={{ background: "hsl(var(--bg-surface2)", border: "1px solid var(--border-default)", borderRadius: 8 }}
          >
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <span className="text-xs font-medium" style={{ color: "hsl(var(--text-primary)", fontFamily: "'DM Sans'" }}>Notificações</span>
              <Link to="/notifications" onClick={() => setShowDropdown(false)} className="text-[10px]" style={{ color: "hsl(var(--accent))", fontFamily: "'JetBrains Mono', monospace" }}>
                Ver todas
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs" style={{ color: "hsl(var(--text-muted)", fontFamily: "'DM Sans'" }}>Nenhuma notificação</p>
              </div>
            ) : (
              <div>
                {recent.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className="w-full text-left px-4 py-3 transition-all duration-150 hover:opacity-80"
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: n.read ? "transparent" : "color-mix(in srgb, var(--accent) 5%, transparent)",
                    }}
                  >
                    <p className="text-xs truncate" style={{ color: "hsl(var(--text-primary)", fontFamily: "'DM Sans'" }}>{n.message}</p>
                    <p className="text-[9px] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted)" }}>
                      {new Date(n.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
