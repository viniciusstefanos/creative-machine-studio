import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Bell, Settings, LogOut, Menu, X, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clients", icon: Users, label: "Clientes" },
  { to: "/notifications", icon: Bell, label: "Notificações" },
];

const settingsItems = [
  { to: "/settings/team", label: "Time" },
  { to: "/settings/templates", label: "Templates" },
  { to: "/settings/formats", label: "Formatos" },
  { to: "/settings/prompts", label: "Prompts IA" },
];

export const SIDEBAR_WIDTH = 220;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string; role: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url, role").eq("id", user.id).single();
      if (data) setProfile(data);
    };
    const fetchUnread = async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
      setUnreadCount(count || 0);
    };
    fetchProfile();
    fetchUnread();
  }, [user]);

  const NavItem = ({ to, icon: Icon, label, badge }: { to: string; icon: any; label: string; badge?: number }) => {
    const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

    const content = (
      <NavLink
        to={to}
        className="flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-150 relative"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          background: isActive ? "hsl(var(--bg-surface3))" : "transparent",
          color: isActive ? "hsl(var(--text-primary))" : "hsl(var(--text-muted))",
          padding: collapsed ? "10px" : "10px 12px",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <Icon size={18} style={{ flexShrink: 0 }} />
        {!collapsed && <span>{label}</span>}
        {badge && badge > 0 && (
          <span
            className="absolute text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: "hsl(var(--status-rejected))",
              color: "hsl(var(--text-primary))",
              fontFamily: "'JetBrains Mono', monospace",
              right: collapsed ? -2 : 12,
              top: collapsed ? -2 : "50%",
              transform: collapsed ? "none" : "translateY(-50%)",
              minWidth: 18,
              textAlign: "center",
            }}
          >
            {badge}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <span style={{ fontFamily: "'DM Sans'" }}>{label}</span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between" style={{ padding: collapsed ? "24px 8px 24px 8px" : "24px 20px" }}>
        {!collapsed && (
          <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif", color: "hsl(var(--accent))" }}>
            Máquina Criativa
          </h1>
        )}
        {collapsed && (
          <h1 className="text-lg font-bold tracking-tight mx-auto" style={{ fontFamily: "'Syne', sans-serif", color: "hsl(var(--accent))" }}>
            MC
          </h1>
        )}
        <button onClick={() => setMobileOpen(false)} className="md:hidden p-1" style={{ color: "hsl(var(--text-muted))" }}>
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} badge={item.label === "Notificações" ? unreadCount : undefined} />
        ))}

        {/* Settings */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
          <NavItem to="/settings/team" icon={Settings} label="Configurações" />
          {!collapsed && location.pathname.startsWith("/settings") && (
            <div className="ml-8 mt-1 space-y-0.5">
              {settingsItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="block px-3 py-1.5 rounded-md text-xs transition-all duration-150"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    color: location.pathname === item.to ? "hsl(var(--text-primary))" : "hsl(var(--text-muted))",
                    background: location.pathname === item.to ? "hsl(var(--bg-surface3))" : "transparent",
                  }}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Collapse toggle - desktop only */}
      <div className="hidden md:flex justify-center py-2" style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-md transition-all hover:bg-[hsl(var(--bg-surface3))]"
          style={{ color: "hsl(var(--text-muted))" }}
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* User Footer */}
      <div className="flex items-center gap-3" style={{ borderTop: "1px solid hsl(var(--border-subtle))", padding: collapsed ? "16px 8px" : "16px" }}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "hsl(var(--bg-surface3))", color: "hsl(var(--text-secondary))" }}
          >
            {user?.email?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans', sans-serif" }}>
              {profile?.full_name || user?.email || "Usuário"}
            </p>
            <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--accent))" }}>
              {profile?.role || "team"}
            </p>
          </div>
        )}
        {!collapsed && (
          <button onClick={signOut} className="p-1.5 rounded transition-all duration-150" style={{ color: "hsl(var(--text-muted))" }} title="Sair">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md md:hidden"
        style={{ background: "hsl(var(--bg-surface2))", color: "hsl(var(--text-primary))" }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 flex flex-col z-50 transition-all duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          width: mobileOpen ? SIDEBAR_WIDTH : width,
          background: "hsl(var(--bg-surface1))",
          borderRight: "1px solid hsl(var(--border-subtle))",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
