import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Check, ImageIcon, CalendarIcon, Clock, ChevronRight, ChevronLeft,
} from "lucide-react";
import { format, addDays, differenceInDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BulkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activationId: string;
  onSaved: () => void;
}

interface ApprovedAsset {
  id: string;
  name: string;
  copy_id: string | null;
  thumbUrl: string | null;
  caption: string;
}

const CHANNELS = [
  { value: "instagram_feed", label: "Feed" },
  { value: "instagram_reels", label: "Reels" },
  { value: "instagram_stories", label: "Stories" },
];

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

type Step = "select" | "configure" | "preview";

export const BulkScheduleDialog = ({
  open, onOpenChange, activationId, onSaved,
}: BulkScheduleDialogProps) => {
  const [step, setStep] = useState<Step>("select");
  const [assets, setAssets] = useState<ApprovedAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Config
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedTimes, setSelectedTimes] = useState<Set<string>>(new Set(["09:00", "18:00"]));
  const [channel, setChannel] = useState("instagram_feed");

  useEffect(() => {
    if (open) {
      setStep("select");
      loadAssets();
    }
  }, [open]);

  const loadAssets = async () => {
    setLoading(true);
    const { data: assetRows } = await supabase
      .from("assets")
      .select("id, name, copy_id")
      .eq("activation_id", activationId)
      .eq("status", "approved");

    if (!assetRows || assetRows.length === 0) {
      setAssets([]);
      setLoading(false);
      return;
    }

    const ids = assetRows.map(a => a.id);
    const { data: renders } = await supabase
      .from("asset_template_renders")
      .select("asset_id, png_url, slide_index")
      .in("asset_id", ids);

    const copyIds = assetRows.filter(a => a.copy_id).map(a => a.copy_id!);
    let copiesMap: Record<string, string> = {};
    if (copyIds.length > 0) {
      const { data: copies } = await supabase
        .from("copies")
        .select("id, full_copy, hook")
        .in("id", copyIds);
      if (copies) {
        copiesMap = Object.fromEntries(
          copies.map(c => [c.id, c.full_copy || c.hook || ""])
        );
      }
    }

    const enriched: ApprovedAsset[] = assetRows.map(a => {
      const firstRender = (renders || [])
        .filter(r => r.asset_id === a.id)
        .sort((x, y) => (x.slide_index ?? 0) - (y.slide_index ?? 0))[0];
      return {
        id: a.id,
        name: a.name || "Peça",
        copy_id: a.copy_id,
        thumbUrl: firstRender?.png_url || null,
        caption: a.copy_id ? copiesMap[a.copy_id] || "" : "",
      };
    });

    setAssets(enriched);
    setSelectedIds(new Set(enriched.map(a => a.id)));
    setLoading(false);
  };

  const toggleAsset = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(assets.map(a => a.id)));
  const clearAll = () => setSelectedIds(new Set());

  const toggleTime = (t: string) => {
    setSelectedTimes(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  // Distribution algorithm
  const distribution = useMemo(() => {
    if (!startDate || !endDate || selectedIds.size === 0 || selectedTimes.size === 0) return [];

    const selected = assets.filter(a => selectedIds.has(a.id));
    const times = [...selectedTimes].sort();
    const totalDays = differenceInDays(endDate, startDate) + 1;

    const slots: { date: Date; time: string }[] = [];
    for (let d = 0; d < totalDays; d++) {
      const day = addDays(startDate, d);
      for (const t of times) {
        slots.push({ date: day, time: t });
      }
    }

    return selected.map((asset, i) => {
      const slot = slots[i % slots.length];
      const [h, m] = slot.time.split(":").map(Number);
      const scheduled = new Date(slot.date);
      scheduled.setHours(h, m, 0, 0);
      return { asset, scheduledAt: scheduled };
    });
  }, [startDate, endDate, selectedIds, selectedTimes, assets]);

  const handleSubmit = async () => {
    if (distribution.length === 0) return;
    setSubmitting(true);

    const rows = distribution.map(d => ({
      activation_id: activationId,
      asset_id: d.asset.id,
      caption: d.asset.caption,
      channel,
      scheduled_at: d.scheduledAt.toISOString(),
      status: "scheduled",
    }));

    const { error } = await supabase.from("scheduled_posts").insert(rows);
    if (error) {
      toast.error("Erro ao agendar: " + error.message);
    } else {
      toast.success(`${rows.length} post(s) agendados com sucesso`);
      onOpenChange(false);
      onSaved();
    }
    setSubmitting(false);
  };

  const canProceedToConfig = selectedIds.size > 0;
  const canProceedToPreview = startDate && endDate && selectedTimes.size > 0 && !isBefore(endDate, startDate);

  const s = {
    surface: "hsl(var(--bg-surface1))",
    surface2: "hsl(var(--bg-surface2))",
    border: "hsl(var(--border-default))",
    accent: "hsl(var(--accent))",
    accentFg: "hsl(var(--accent-foreground))",
    textPri: "hsl(var(--text-primary))",
    textSec: "hsl(var(--text-secondary))",
    textMut: "hsl(var(--text-muted))",
    font: "'DM Sans'",
    mono: "'JetBrains Mono', monospace",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{ background: s.surface, border: `1px solid ${s.border}` }}
      >
        <DialogHeader>
          <DialogTitle className="text-display-sm" style={{ color: s.textPri }}>
            Agendar em massa
          </DialogTitle>
          <p className="text-xs mt-1" style={{ color: s.textMut, fontFamily: s.font }}>
            {step === "select" && "Selecione as peças aprovadas"}
            {step === "configure" && "Configure datas e horários"}
            {step === "preview" && `Confirme ${distribution.length} agendamento(s)`}
          </p>
        </DialogHeader>

        {/* Step: Select assets */}
        {step === "select" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: s.textSec, fontFamily: s.font }}>
                Peças aprovadas ({selectedIds.size}/{assets.length})
              </p>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] underline" style={{ color: s.accent, fontFamily: s.font }}>
                  Selecionar tudo
                </button>
                <button onClick={clearAll} className="text-[10px] underline" style={{ color: s.textMut, fontFamily: s.font }}>
                  Limpar
                </button>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin" style={{ color: s.accent }} />
              </div>
            ) : assets.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: s.textMut, fontFamily: s.font }}>
                Nenhuma peça aprovada disponível
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto">
                {assets.map(asset => {
                  const sel = selectedIds.has(asset.id);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => toggleAsset(asset.id)}
                      className="relative rounded-md overflow-hidden transition-all"
                      style={{
                        border: `2px solid ${sel ? s.accent : s.border}`,
                        aspectRatio: "1",
                      }}
                    >
                      {asset.thumbUrl ? (
                        <img src={asset.thumbUrl} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: s.surface2 }}>
                          <ImageIcon size={18} style={{ color: s.textMut }} />
                        </div>
                      )}
                      {sel && (
                        <div
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: s.accent }}
                        >
                          <Check size={12} style={{ color: s.accentFg }} />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1" style={{ background: "hsla(var(--bg-base) / 0.8)" }}>
                        <p className="text-[9px] truncate" style={{ color: s.textPri, fontFamily: s.mono }}>
                          {asset.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!canProceedToConfig}
                onClick={() => setStep("configure")}
                className="gap-1.5"
                style={{ background: s.accent, color: s.accentFg, fontFamily: s.font, borderRadius: 6 }}
              >
                Próximo <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Configure */}
        {step === "configure" && (
          <div className="space-y-4">
            {/* Date pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: s.textSec, fontFamily: s.font }}>Data início</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("w-full justify-start text-left text-xs", !startDate && "text-muted-foreground")}
                      style={{ background: s.surface2, borderColor: s.border, fontFamily: s.font }}
                    >
                      <CalendarIcon size={14} className="mr-1.5" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(d) => isBefore(startOfDay(d), startOfDay(new Date()))}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: s.textSec, fontFamily: s.font }}>Data fim</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("w-full justify-start text-left text-xs", !endDate && "text-muted-foreground")}
                      style={{ background: s.surface2, borderColor: s.border, fontFamily: s.font }}
                    >
                      <CalendarIcon size={14} className="mr-1.5" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(d) => startDate ? isBefore(d, startDate) : isBefore(startOfDay(d), startOfDay(new Date()))}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Time slots */}
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: s.textSec, fontFamily: s.font }}>
                Horários <span style={{ color: s.textMut }}>({selectedTimes.size} selecionado{selectedTimes.size !== 1 ? "s" : ""})</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TIME_SLOTS.map(t => {
                  const sel = selectedTimes.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTime(t)}
                      className="px-2 py-1 rounded text-[11px] transition-all"
                      style={{
                        background: sel ? "hsl(var(--accent) / 0.15)" : s.surface2,
                        border: `1px solid ${sel ? s.accent : s.border}`,
                        color: sel ? s.accent : s.textSec,
                        fontFamily: s.mono,
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Channel */}
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: s.textSec, fontFamily: s.font }}>Canal</p>
              <div className="flex gap-2">
                {CHANNELS.map(ch => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => setChannel(ch.value)}
                    className="px-3 py-1.5 rounded text-xs transition-all"
                    style={{
                      background: channel === ch.value ? "hsl(var(--accent) / 0.15)" : s.surface2,
                      border: `1px solid ${channel === ch.value ? s.accent : s.border}`,
                      color: channel === ch.value ? s.accent : s.textSec,
                      fontFamily: s.font,
                    }}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep("select")}
                className="gap-1.5"
                style={{ color: s.textMut, fontFamily: s.font }}
              >
                <ChevronLeft size={14} /> Voltar
              </Button>
              <Button
                size="sm"
                disabled={!canProceedToPreview}
                onClick={() => setStep("preview")}
                className="gap-1.5"
                style={{ background: s.accent, color: s.accentFg, fontFamily: s.font, borderRadius: 6 }}
              >
                Ver preview <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="space-y-3">
            <div className="max-h-[340px] overflow-y-auto space-y-1.5">
              {distribution.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-md"
                  style={{ background: s.surface2, border: `1px solid ${s.border}` }}
                >
                  <div className="w-8 h-8 rounded overflow-hidden shrink-0" style={{ background: s.surface }}>
                    {d.asset.thumbUrl ? (
                      <img src={d.asset.thumbUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={12} style={{ color: s.textMut }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] truncate" style={{ color: s.textPri, fontFamily: s.mono }}>
                      {d.asset.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CalendarIcon size={11} style={{ color: s.textMut }} />
                    <span className="text-[11px]" style={{ color: s.textSec, fontFamily: s.mono }}>
                      {format(d.scheduledAt, "dd/MM")}
                    </span>
                    <Clock size={11} style={{ color: s.textMut }} />
                    <span className="text-[11px]" style={{ color: s.textSec, fontFamily: s.mono }}>
                      {format(d.scheduledAt, "HH:mm")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep("configure")}
                className="gap-1.5"
                style={{ color: s.textMut, fontFamily: s.font }}
              >
                <ChevronLeft size={14} /> Voltar
              </Button>
              <Button
                size="sm"
                disabled={submitting || distribution.length === 0}
                onClick={handleSubmit}
                className="gap-1.5"
                style={{ background: s.accent, color: s.accentFg, fontFamily: s.font, borderRadius: 6 }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {submitting ? "Agendando..." : `Agendar ${distribution.length} post(s)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
