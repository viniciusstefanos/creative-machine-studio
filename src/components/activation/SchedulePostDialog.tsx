import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, Loader2, Image } from "lucide-react";

interface SchedulePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activationId: string;
  preselectedAssetId?: string;
  editingPost?: any;
  onSaved: () => void;
}

const CHANNELS = [
  { value: "instagram_feed", label: "Instagram Feed" },
  { value: "instagram_reels", label: "Instagram Reels" },
  { value: "instagram_stories", label: "Instagram Stories" },
];

const SUGGESTED_TIMES = ["09:00", "12:00", "18:00", "20:00"];

export const SchedulePostDialog = ({
  open, onOpenChange, activationId, preselectedAssetId, editingPost, onSaved,
}: SchedulePostDialogProps) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState(preselectedAssetId || "");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [channel, setChannel] = useState("instagram_feed");
  const [saving, setSaving] = useState(false);
  const [loadingCaption, setLoadingCaption] = useState(false);

  // Load approved assets
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase
        .from("assets")
        .select("id, name, category, image_url, copy_id, template_id, status, version")
        .eq("activation_id", activationId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      // Also include the preselected/editing asset even if not approved
      if (preselectedAssetId && !(data || []).find((a) => a.id === preselectedAssetId)) {
        const { data: extra } = await supabase
          .from("assets")
          .select("id, name, category, image_url, copy_id, template_id, status, version")
          .eq("id", preselectedAssetId)
          .maybeSingle();
        if (extra) data?.push(extra);
      }
      setAssets(data || []);

      if (editingPost) {
        setSelectedAssetId(editingPost.asset_id || "");
        setCaption(editingPost.caption || "");
        setChannel(editingPost.channel || "instagram_feed");
        if (editingPost.scheduled_at) {
          const d = new Date(editingPost.scheduled_at);
          setDate(d.toISOString().slice(0, 10));
          setTime(d.toTimeString().slice(0, 5));
        }
      } else {
        if (preselectedAssetId) setSelectedAssetId(preselectedAssetId);
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().slice(0, 10));
      }
    };
    load();
  }, [open, activationId, preselectedAssetId, editingPost]);

  // Load caption from copy when asset changes
  useEffect(() => {
    if (!selectedAssetId || editingPost) return;
    const loadCaption = async () => {
      setLoadingCaption(true);
      const asset = assets.find((a) => a.id === selectedAssetId);
      if (asset?.copy_id) {
        const { data: copy } = await supabase
          .from("copies")
          .select("full_copy, hook, body, cta")
          .eq("id", asset.copy_id)
          .single();
        if (copy) {
          setCaption(copy.full_copy || [copy.hook, copy.body, copy.cta].filter(Boolean).join("\n\n"));
        }
      }
      setLoadingCaption(false);
    };
    loadCaption();
  }, [selectedAssetId, assets, editingPost]);

  const handleSave = async () => {
    if (!selectedAssetId) {
      toast({ title: "Selecione uma peça", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Defina a data", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      const payload = {
        activation_id: activationId,
        asset_id: selectedAssetId,
        caption,
        channel,
        scheduled_at: scheduledAt,
        status: "scheduled",
      };

      if (editingPost) {
        await supabase.from("scheduled_posts").update(payload).eq("id", editingPost.id);
        toast({ title: "Agendamento atualizado!" });
      } else {
        await supabase.from("scheduled_posts").insert(payload);
        toast({ title: "Post agendado!" });
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[hsl(var(--bg-card))] border-[hsl(var(--border-subtle))]">
        <DialogHeader>
          <DialogTitle className="text-heading-sm">
            {editingPost ? "Editar agendamento" : "Agendar post"}
          </DialogTitle>
          <DialogDescription className="text-caption">
            Selecione a peça, defina a caption e agende.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Asset selector */}
          <div className="space-y-1.5">
            <Label className="text-mono-label">Peça</Label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger className="bg-[hsl(var(--bg-base))] border-[hsl(var(--border-subtle))]">
                <SelectValue placeholder="Selecione uma peça aprovada" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => {
                  const label = (a as any).name || a.category || a.id.slice(0, 8);
                  const version = (a as any).name ? "" : (a.version ? `v${a.version}` : "");
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        {a.image_url ? (
                          <img src={a.image_url} alt="" className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <Image size={14} className="text-txt-ghost" />
                        )}
                        <span>{label}</span>
                        {version && <span className="text-[10px] text-caption">{version}</span>}
                        {a.status !== "approved" && (
                          <span className="text-[10px] text-amber-400">({a.status})</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedAsset?.image_url && (
              <img
                src={selectedAsset.image_url}
                alt="preview"
                className="w-full max-h-40 object-contain rounded-md mt-2 bg-[hsl(var(--bg-base))]"
              />
            )}
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <Label className="text-mono-label">Caption</Label>
            {loadingCaption ? (
              <div className="flex items-center gap-2 text-caption text-xs">
                <Loader2 size={12} className="animate-spin" /> Carregando caption...
              </div>
            ) : (
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption do post..."
                rows={5}
                className="bg-[hsl(var(--bg-base))] border-[hsl(var(--border-subtle))] text-sm"
              />
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-mono-label flex items-center gap-1">
                <Calendar size={12} /> Data
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-[hsl(var(--bg-base))] border-[hsl(var(--border-subtle))] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-mono-label flex items-center gap-1">
                <Clock size={12} /> Horário
              </Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-[hsl(var(--bg-base))] border-[hsl(var(--border-subtle))] text-sm"
              />
              <div className="flex gap-1 mt-1">
                {SUGGESTED_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                      time === t
                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]"
                        : "bg-[hsl(var(--bg-raised))] text-caption hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <Label className="text-mono-label">Canal</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="bg-[hsl(var(--bg-base))] border-[hsl(var(--border-subtle))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
            {editingPost ? "Salvar alterações" : "Agendar post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
