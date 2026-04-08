import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Instagram, Megaphone, RefreshCw, Check, Loader2, Save } from "lucide-react";

interface MetaAccountSettingsProps {
  clientId: string;
}

interface OrganicForm {
  instagram_page_id: string;
  instagram_username: string;
  facebook_page_id: string;
  page_access_token: string;
}

interface AdsForm {
  ad_account_id: string;
  ad_account_name: string;
  page_access_token: string;
  pixel_id: string;
}

export const MetaAccountSettings = ({ clientId }: MetaAccountSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  // Organic state
  const [organicRecord, setOrganicRecord] = useState<any>(null);
  const [savingOrganic, setSavingOrganic] = useState(false);
  const [organicForm, setOrganicForm] = useState<OrganicForm>({
    instagram_page_id: "",
    instagram_username: "",
    facebook_page_id: "",
    page_access_token: "",
  });

  // Ads state
  const [adsRecord, setAdsRecord] = useState<any>(null);
  const [savingAds, setSavingAds] = useState(false);
  const [adsForm, setAdsForm] = useState<AdsForm>({
    ad_account_id: "",
    ad_account_name: "",
    page_access_token: "",
    pixel_id: "",
  });

  useEffect(() => {
    const load = async () => {
      // Fetch all meta accounts for this client
      const { data } = await supabase
        .from("client_meta_accounts")
        .select("*")
        .eq("client_id", clientId);

      const records = data || [];

      // Find organic record (meta_organic or legacy "meta")
      const organic = records.find((r) => r.platform === "meta_organic")
        || records.find((r) => r.platform === "meta");
      // Find ads record (meta_ads or legacy "meta")
      const ads = records.find((r) => r.platform === "meta_ads")
        || records.find((r) => r.platform === "meta");

      if (organic) {
        setOrganicRecord(organic);
        setOrganicForm({
          instagram_page_id: organic.instagram_page_id || "",
          instagram_username: organic.instagram_username || "",
          facebook_page_id: organic.facebook_page_id || "",
          page_access_token: organic.page_access_token || "",
        });
      }

      if (ads) {
        setAdsRecord(ads);
        setAdsForm({
          ad_account_id: ads.ad_account_id || "",
          ad_account_name: ads.ad_account_name || "",
          page_access_token: ads.platform === "meta_ads" ? (ads.page_access_token || "") : "",
          pixel_id: (ads as any).pixel_id || "",
        });
      }

      setLoading(false);
    };
    load();
  }, [clientId]);

  const handleSaveOrganic = async () => {
    setSavingOrganic(true);
    const payload = {
      client_id: clientId,
      platform: "meta_organic" as const,
      instagram_page_id: organicForm.instagram_page_id || null,
      instagram_username: organicForm.instagram_username || null,
      facebook_page_id: organicForm.facebook_page_id || null,
      page_access_token: organicForm.page_access_token || null,
    };

    if (organicRecord && organicRecord.platform === "meta_organic") {
      await supabase.from("client_meta_accounts").update(payload).eq("id", organicRecord.id);
    } else {
      // Insert new or migrate legacy
      const { data } = await supabase.from("client_meta_accounts").insert(payload).select().single();
      if (data) setOrganicRecord(data);
    }
    setSavingOrganic(false);
    toast({ title: "Conexão orgânica salva" });
  };

  const handleSaveAds = async () => {
    setSavingAds(true);
    const payload = {
      client_id: clientId,
      platform: "meta_ads" as const,
      ad_account_id: adsForm.ad_account_id || null,
      ad_account_name: adsForm.ad_account_name || null,
      page_access_token: adsForm.page_access_token || null,
      pixel_id: adsForm.pixel_id || null,
    };

    if (adsRecord && adsRecord.platform === "meta_ads") {
      await supabase.from("client_meta_accounts").update(payload).eq("id", adsRecord.id);
    } else {
      const { data } = await supabase.from("client_meta_accounts").insert(payload).select().single();
      if (data) setAdsRecord(data);
    }
    setSavingAds(false);
    toast({ title: "Conexão de anúncios salva" });
  };

  const handleFetchPages = async () => {
    setFetching(true);
    try {
      const tokenToUse = organicForm.page_access_token || undefined;
      const { data, error } = await supabase.functions.invoke("meta-publish", {
        body: { action: "get_pages", ...(tokenToUse ? { page_access_token: tokenToUse } : {}) },
      });
      if (error) throw error;
      if (data?.data?.length > 0) {
        const page = data.data[0];
        const igAccount = page.instagram_business_account;
        setOrganicForm((prev) => ({
          ...prev,
          facebook_page_id: page.id || prev.facebook_page_id,
          instagram_page_id: igAccount?.id || prev.instagram_page_id,
          instagram_username: igAccount?.username || prev.instagram_username,
        }));
        if (igAccount) {
          toast({ title: "Página e Instagram encontrados", description: `Page ${page.id} · @${igAccount.username}` });
        } else {
          toast({ title: "Página encontrada, sem Instagram Business vinculado", description: `Page ID: ${page.id}` });
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
      const tokenToUse = adsForm.page_access_token || undefined;
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: { action: "get_ad_accounts", ...(tokenToUse ? { page_access_token: tokenToUse } : {}) },
      });
      if (error) throw error;
      if (data?.data?.length > 0) {
        const acc = data.data[0];
        setAdsForm((prev) => ({
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
    <div className="space-y-6">
      <SectionLabel>Conexões Meta</SectionLabel>

      {/* ─── Organic ─── */}
      <div className="card-base space-y-3">
        <div className="flex items-center gap-2">
          <Instagram size={16} className="text-accent" />
          <span className="text-heading text-sm">Orgânico (Instagram / Facebook Page)</span>
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

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">Facebook Page ID</label>
            <Input
              value={organicForm.facebook_page_id}
              onChange={(e) => setOrganicForm({ ...organicForm, facebook_page_id: e.target.value })}
              placeholder="123456789..."
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="field-label">Instagram Actor ID</label>
            <Input
              value={organicForm.instagram_page_id}
              onChange={(e) => setOrganicForm({ ...organicForm, instagram_page_id: e.target.value })}
              placeholder="17841400..."
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="field-label">Username</label>
            <Input
              value={organicForm.instagram_username}
              onChange={(e) => setOrganicForm({ ...organicForm, instagram_username: e.target.value })}
              placeholder="@perfil"
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="field-label">Access Token (orgânico — opcional, usa o global se vazio)</label>
          <Input
            value={organicForm.page_access_token}
            onChange={(e) => setOrganicForm({ ...organicForm, page_access_token: e.target.value })}
            placeholder="EAA..."
            className="text-xs font-mono"
            type="password"
          />
        </div>

        {organicForm.facebook_page_id && organicForm.instagram_page_id && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--accent))" }}>
            <Check size={12} /> Vinculado
          </div>
        )}

        <Button onClick={handleSaveOrganic} disabled={savingOrganic} className="btn-primary w-full" size="sm">
          {savingOrganic ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
          Salvar orgânico
        </Button>
      </div>

      {/* ─── Ads ─── */}
      <div className="card-base space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-accent" />
          <span className="text-heading text-sm">Conta de Anúncios (Ads Manager)</span>
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
              value={adsForm.ad_account_id}
              onChange={(e) => setAdsForm({ ...adsForm, ad_account_id: e.target.value })}
              placeholder="act_123456..."
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="field-label">Nome da conta</label>
            <Input
              value={adsForm.ad_account_name}
              onChange={(e) => setAdsForm({ ...adsForm, ad_account_name: e.target.value })}
              placeholder="Minha conta de ads"
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="field-label">Access Token (ads — opcional, usa o global se vazio)</label>
          <Input
            value={adsForm.page_access_token}
            onChange={(e) => setAdsForm({ ...adsForm, page_access_token: e.target.value })}
            placeholder="EAA..."
            className="text-xs font-mono"
            type="password"
          />
        </div>

        <div>
          <label className="field-label">Pixel ID (para campanhas de conversão)</label>
          <Input
            value={adsForm.pixel_id}
            onChange={(e) => setAdsForm({ ...adsForm, pixel_id: e.target.value })}
            placeholder="123456789..."
            className="text-xs font-mono"
          />
        </div>

        {adsForm.ad_account_id && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--accent))" }}>
            <Check size={12} /> Vinculado
          </div>
        )}

        <Button onClick={handleSaveAds} disabled={savingAds} className="btn-primary w-full" size="sm">
          {savingAds ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
          Salvar conta de anúncios
        </Button>
      </div>
    </div>
  );
};
