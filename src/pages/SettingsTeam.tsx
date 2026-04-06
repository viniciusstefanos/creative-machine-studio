import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Users, Shield, User } from "lucide-react";

const SettingsTeam = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleRoleChange = async (profileId: string, newRole: string) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", profileId);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível alterar o role.", variant: "destructive" });
    } else {
      toast({ title: "Role atualizado" });
      fetchProfiles();
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    // Note: invite requires admin/service role. Show instruction.
    toast({
      title: "Convite",
      description: `Para convidar ${inviteEmail}, envie o link de cadastro da plataforma diretamente.`,
    });
    setInviteEmail("");
    setInviting(false);
  };

  const inputStyle = {
    background: "var(--bg-base)",
    border: "1px solid var(--border-strong)",
    color: "var(--text-primary)",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: 6,
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Configurações" }, { label: "Time" }]}>
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
        Gerenciamento de Time
      </h1>

      {/* Invite */}
      <div className="p-5 rounded-lg mb-6" style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
        <SectionLabel>Convidar membro</SectionLabel>
        <form onSubmit={handleInvite} className="flex gap-3 mt-3">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            type="email"
            placeholder="email@exemplo.com"
            className="flex-1 px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={inviting}
            className="px-5 py-2.5 text-sm font-medium rounded-md transition-all duration-150 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--text-inverse)", fontFamily: "'DM Sans'", borderRadius: 6 }}
          >
            Convidar
          </button>
        </form>
      </div>

      {/* Team List */}
      <SectionLabel>Membros</SectionLabel>
      {loading ? (
        <div className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>Carregando...</div>
      ) : (
        <div className="space-y-2 mt-3">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 p-4 rounded-lg"
              style={{ background: "var(--bg-surface1)", border: "1px solid var(--border-default)", borderRadius: 8 }}
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--bg-surface3)", color: "var(--text-secondary)" }}
                >
                  {p.full_name?.[0]?.toUpperCase() || p.email?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans'" }}>
                  {p.full_name || p.email || "Sem nome"}
                </p>
                <p className="text-[10px] truncate" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                  {p.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.role === "admin" ? (
                  <Shield size={14} style={{ color: "var(--accent)" }} />
                ) : (
                  <User size={14} style={{ color: "var(--text-muted)" }} />
                )}
                <select
                  value={p.role || "team"}
                  onChange={(e) => handleRoleChange(p.id, e.target.value)}
                  disabled={p.id === user?.id}
                  className="px-2 py-1 text-[11px] outline-none disabled:opacity-50"
                  style={{
                    ...inputStyle,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="team">Team</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default SettingsTeam;
