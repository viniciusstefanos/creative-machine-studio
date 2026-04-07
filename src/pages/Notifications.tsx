import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Bell, FileText, Image, Users, CheckCircle, XCircle, Send } from "lucide-react";
import { Link } from "react-router-dom";

const iconMap: Record<string, React.ElementType> = {
  copy_review: FileText,
  asset_review: Image,
  published: Send,
  rejected: XCircle,
  assigned: Users,
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    fetchNotifications();
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Notificações" }]}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "hsl(var(--text-primary))" }}>
          Notificações
        </h1>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="text-xs font-medium px-3 py-2 rounded-md transition-all duration-150"
            style={{ background: "hsl(var(--bg-surface2))", border: "1px solid var(--border-strong)", color: "hsl(var(--text-secondary))", fontFamily: "'DM Sans'", borderRadius: 6 }}
          >
            Marcar tudo como lido
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>Carregando...</div>
      ) : notifications.length === 0 ? (
        <div className="p-12 rounded-lg text-center" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid var(--border-default)", borderRadius: 8 }}>
          <Bell size={40} className="mx-auto mb-4" style={{ color: "hsl(var(--text-muted))" }} />
          <p className="text-sm" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>Nenhuma notificação</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = iconMap[notif.type] || Bell;
            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-150"
                style={{
                  background: notif.read ? "hsl(var(--bg-base))" : "hsl(var(--bg-surface1))",
                  border: `1px solid ${notif.read ? "hsl(var(--border-subtle))" : "hsl(var(--border-default))"}`,
                  borderRadius: 8,
                  opacity: notif.read ? 0.7 : 1,
                }}
              >
                <div className="p-2 rounded" style={{ background: "hsl(var(--bg-surface3))" }}>
                  <Icon size={16} style={{ color: notif.read ? "hsl(var(--text-muted))" : "hsl(var(--accent))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                    {notif.message || "Notificação"}
                  </p>
                  <p className="text-[10px] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                    {new Date(notif.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                {!notif.read && (
                  <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: "hsl(var(--accent))" }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default Notifications;
