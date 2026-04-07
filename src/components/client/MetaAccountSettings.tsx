import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Instagram, Megaphone, RefreshCw, Check, Loader2 } from "lucide-react";

interface MetaAccountSettingsProps {
  clientId: string;
}

export const MetaAccountSettings = ({ clientId }: MetaAccountSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [form, setForm] = useState({
    instagram_page_id: "",
    instagram_username: "",
    ad_account_id: "",
    ad_account_name: "",
    facebook_page_id: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("client_meta_accounts")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (data) {
        setAccount(data);
        setForm({
          instagram_page_id: data.instagram_page_id || "",
          instagram_username: data.instagram_username || "",
          ad_account_id: data.ad_account_id || "",
          ad_account_name: data.ad_account_name || "",
          facebook_page_id: data.facebook_page_id || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      client_id: clientId,
      platform: "meta",
      ...form,
    };

    if (account) {
      await supabase.from("client_meta_accounts").update(payload).eq("id", account.id);
    } else {
      const { data } = await supabase.from("client_meta_accounts").insert(payload).select().single();
      setAccount(data);
    }
    setSaving(false);
    toast({ title: "Contas Meta salvas" });
  };

  const handleFetchPages = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-publish", {
        body: { action: "get_pages" },
      });
      if (error) throw error;
      if (data?.data?.length > 0) {
        const page = data.data[0];
        const igAccount = page.instagram_business_account;
        if (igAccount) {
          setForm((prev) => ({
            ...prev,
            instagram_page_id: igAccount.id,
            instagram_username: igAccount.username || "",
          }));
          toast({ title: "Conta Instagram encontrada", description: `@${igAccount.username}` });
        } else {
          toast({ title: "Nenhuma conta Instagram Business vinculada à página", variant: "destructive" });
        }
      } else {
        toast({ title: "Nenhuma página encontrada no token", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro ao buscar páginas", description: e.message, variant: "destructive" });
    }
    setFetching(false);
  };

  const handleFetchAdAccounts = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: { action: "get_ad_accounts" },
      });
      if (error) throw error;
      if (data?.data?.length > 0) {
        const acc = data.data[0];
        setForm((prev) => ({
          ...prev,
          ad_account_id: acc.id,
          ad_account_name: acc.name || acc.id,
        }));
        toast({ title: "Conta de anúncios encontrada", description: acc.name || acc.id });
      } else {
        toast({ title: "Nenhuma conta de anúncios encontrada", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro ao buscar contas de anúncios", description: e.message, variant: "destructive" });
    }
    setFetching(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-5">
      <SectionLabel>Contas Meta</SectionLabel>

      {/* Instagram */}
      <div className="card-base space-y-3">
        <div className="flex items-center gap-2">
          <Instagram size={16} className="text-accent" />
          <span className="text-heading text-sm">Instagram</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFetchPages}
            disabled={fetching}
            className="ml-auto text-xs"
          >
            {fetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="ml-1">Auto-detectar</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Page ID</label>
            <Input
              value={form.instagram_page_id}
              onChange={(e) => setForm({ ...form, instagram_page_id: e.target.value })}
              placeholder="17841400..."
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="field-label">Username</label>
            <Input
              value={form.instagram_username}
              onChange={(e) => setForm({ ...form, instagram_username: e.target.value })}
              placeholder="@perfil"
              className="text-xs"
            />
          </div>
        </div>
        {form.instagram_page_id && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--accent))" }}>
            <Check size={12} /> Vinculado
          </div>
        )}
      </div>

      {/* Ad Account */}
      <div className="card-base space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-accent" />
          <span className="text-heading text-sm">Conta de Anúncios</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFetchAdAccounts}
            disabled={fetching}
            className="ml-auto text-xs"
          >
            {fetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="ml-1">Auto-detectar</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Ad Account ID</label>
            <Input
              value={form.ad_account_id}
              onChange={(e) => setForm({ ...form, ad_account_id: e.target.value })}
              placeholder="act_123456..."
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="field-label">Nome da conta</label>
            <Input
              value={form.ad_account_name}
              onChange={(e) => setForm({ ...form, ad_account_name: e.target.value })}
              placeholder="Minha conta de ads"
              className="text-xs"
            />
          </div>
        </div>
        {form.ad_account_id && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--accent))" }}>
            <Check size={12} /> Vinculado
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} className="btn-primary w-full">
        {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
        Salvar contas Meta
      </Button>
    </div>
  );
};
