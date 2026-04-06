import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Bell, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clients", icon: Users, label: "Clientes" },
  { to: "/notifications", icon: Bell, label: "Notificações" },
];

const settingsItems = [
  { to: "/settings/team", label: "Time" },
  { to: "/settings/templates", label: "Templates" },
  { to: "/settings/formats", label: "Formatos" },
];

export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string; role: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, role")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    };

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };

    fetchProfile();
    fetchUnread();
  }, [user]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-6 flex items-center justify-between">
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent)" }}
        >
          Máquina Criativa
        </h1>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 relative"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                background: isActive ? "var(--bg-surface3)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.label === "Notificações" && unreadCount > 0 && (
                <span
                  className="absolute right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "var(--status-rejected)",
                    color: "var(--text-primary)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Settings section */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <NavLink
            to="/settings/team"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              background: location.pathname.startsWith("/settings") ? "var(--bg-surface3)" : "transparent",
              color: location.pathname.startsWith("/settings") ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            <Settings size={18} />
            <span>Configurações</span>
          </NavLink>
          {location.pathname.startsWith("/settings") && (
            <div className="ml-8 mt-1 space-y-0.5">
              {settingsItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="block px-3 py-1.5 rounded-md text-xs transition-all duration-150"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    color: location.pathname === item.to ? "var(--text-primary)" : "var(--text-muted)",
                    background: location.pathname === item.to ? "var(--bg-surface3)" : "transparent",
                  }}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User Footer */}
      <div
        className="px-4 py-4 flex items-center gap-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--bg-surface3)", color: "var(--text-secondary)" }}
          >
            {user?.email?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs truncate" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
            {profile?.full_name || user?.email || "Usuário"}
          </p>
          <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>
            {profile?.role || "team"}
          </p>
        </div>
        <button onClick={signOut} className="p-1.5 rounded transition-all duration-150" style={{ color: "var(--text-muted)" }} title="Sair">
          <LogOut size={16} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md md:hidden"
        style={{ background: "var(--bg-surface2)", color: "var(--text-primary)" }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop always visible, mobile as overlay */}
      <aside
        className={`fixed left-0 top-0 bottom-0 flex flex-col z-50 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          width: 220,
          background: "var(--bg-surface1)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
