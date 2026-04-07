import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save, RotateCcw, Palette, Type, Code, X,
  Heading1, Heading2, AlignLeft, MousePointerClick, Tag, Minus,
} from "lucide-react";

interface HtmlVisualEditorProps {
  html: string;
  onChange: (html: string) => void;
  onSave: () => void;
  onClose: () => void;
  onRestore: () => void;
  loading?: boolean;
}

/* ── Color extraction ── */
function extractColors(html: string): { value: string; count: number; isSolid: boolean }[] {
  const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;
  const hslRegex = /hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(?:,\s*[\d.]+\s*)?\)/g;

  const countMap = new Map<string, number>();
  const addAll = (matches: string[]) => matches.forEach(c => {
    const key = c.toLowerCase().replace(/\s+/g, "");
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });

  addAll(html.match(hexRegex) || []);
  addAll(html.match(rgbRegex) || []);
  addAll(html.match(hslRegex) || []);

  return Array.from(countMap.entries())
    .map(([value, count]) => ({
      value,
      count,
      isSolid: !value.includes("rgba") && !value.includes("hsla") && !value.includes(",0."),
    }))
    .sort((a, b) => b.count - a.count);
}

/* ── Text extraction ── */
interface TextSegment {
  text: string;
  tag: string;
  priority: number;
}

function extractTextSegments(html: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /<(h[1-6]|p|span|div|a|button|li|td|th|strong|em|b|i|label|figcaption)([^>]*)>([\s\S]*?)<\/\1>/gi;
  const priorities: Record<string, number> = {
    h1: 0, h2: 1, h3: 2, h4: 3, button: 4, a: 5,
    p: 6, span: 7, strong: 8, b: 8, em: 9, div: 10,
    li: 11, label: 12, figcaption: 13,
  };
  let match;
  while ((match = regex.exec(html)) !== null) {
    const innerText = match[3].replace(/<[^>]*>/g, "").trim();
    if (innerText.length > 0 && innerText.length < 500) {
      segments.push({
        text: innerText,
        tag: match[1].toLowerCase(),
        priority: priorities[match[1].toLowerCase()] ?? 10,
      });
    }
  }
  const seen = new Set<string>();
  return segments
    .filter(s => { if (seen.has(s.text)) return false; seen.add(s.text); return true; })
    .sort((a, b) => a.priority - b.priority);
}

const TAG_META: Record<string, { label: string; icon: typeof Type }> = {
  h1: { label: "Título", icon: Heading1 },
  h2: { label: "Subtítulo", icon: Heading2 },
  h3: { label: "Heading", icon: Heading2 },
  h4: { label: "Heading", icon: Heading2 },
  p: { label: "Parágrafo", icon: AlignLeft },
  span: { label: "Texto", icon: Type },
  div: { label: "Bloco", icon: Minus },
  a: { label: "Link", icon: MousePointerClick },
  button: { label: "CTA", icon: MousePointerClick },
  strong: { label: "Destaque", icon: Type },
  b: { label: "Destaque", icon: Type },
  em: { label: "Itálico", icon: Type },
  li: { label: "Item", icon: Tag },
  label: { label: "Label", icon: Tag },
  figcaption: { label: "Legenda", icon: Tag },
};

/* ── Checkerboard for alpha colors ── */
const checkerboard = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23333'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23333'/%3E%3Crect x='8' width='8' height='8' fill='%23555'/%3E%3Crect y='8' width='8' height='8' fill='%23555'/%3E%3C/svg%3E")`;

export const HtmlVisualEditor = ({
  html, onChange, onSave, onClose, onRestore, loading,
}: HtmlVisualEditorProps) => {
  const [tab, setTab] = useState("text");

  const allColors = useMemo(() => extractColors(html), [html]);
  const solidColors = useMemo(() => allColors.filter(c => c.isSolid), [allColors]);
  const alphaColors = useMemo(() => allColors.filter(c => !c.isSolid), [allColors]);
  const textSegments = useMemo(() => extractTextSegments(html), [html]);

  const updateText = useCallback((oldText: string, newText: string) => {
    if (oldText === newText) return;
    onChange(html.replace(oldText, newText));
  }, [html, onChange]);

  const replaceColor = useCallback((oldColor: string, newColor: string) => {
    if (!newColor || oldColor === newColor) return;
    const escaped = oldColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    onChange(html.replace(new RegExp(escaped, "gi"), newColor));
  }, [html, onChange]);

  const changeCount = useMemo(() => {
    // rough indicator
    return allColors.length + textSegments.length;
  }, [allColors, textSegments]);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "hsl(var(--bg-surface1))",
        border: "1px solid hsl(var(--border-default))",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid hsl(var(--border-subtle))" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span
            className="text-[11px] font-semibold uppercase tracking-[2px]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-secondary))" }}
          >
            Editor visual
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors hover:bg-surface-2"
          style={{ color: "hsl(var(--text-muted))" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="px-4 pt-3">
          <TabsList
            className="w-full h-9 p-0.5 gap-0.5"
            style={{
              background: "hsl(var(--bg-base))",
              border: "1px solid hsl(var(--border-subtle))",
              borderRadius: 6,
            }}
          >
            <TabsTrigger
              value="text"
              className="flex-1 gap-1.5 h-full text-[11px] rounded-[4px] data-[state=active]:bg-surface-2 data-[state=active]:text-txt-primary data-[state=inactive]:text-txt-muted"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Type size={12} /> Textos
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-[9px]"
                style={{
                  background: tab === "text" ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                  color: tab === "text" ? "hsl(var(--accent))" : "hsl(var(--text-ghost))",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {textSegments.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="colors"
              className="flex-1 gap-1.5 h-full text-[11px] rounded-[4px] data-[state=active]:bg-surface-2 data-[state=active]:text-txt-primary data-[state=inactive]:text-txt-muted"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Palette size={12} /> Cores
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-[9px]"
                style={{
                  background: tab === "colors" ? "hsl(var(--accent) / 0.15)" : "hsl(var(--bg-surface2))",
                  color: tab === "colors" ? "hsl(var(--accent))" : "hsl(var(--text-ghost))",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {allColors.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="flex-1 gap-1.5 h-full text-[11px] rounded-[4px] data-[state=active]:bg-surface-2 data-[state=active]:text-txt-primary data-[state=inactive]:text-txt-muted"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Code size={12} /> HTML
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── TEXT TAB ─── */}
        <TabsContent value="text" className="px-4 pb-4 mt-0">
          {textSegments.length === 0 ? (
            <div className="py-8 text-center">
              <Type size={20} className="mx-auto mb-2 text-txt-ghost" />
              <p className="text-body-sm text-txt-muted">Nenhum texto encontrado</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1 mt-3">
              {textSegments.map((seg, i) => {
                const meta = TAG_META[seg.tag] || { label: seg.tag, icon: Type };
                const Icon = meta.icon;
                const isHeading = seg.tag.startsWith("h");
                const isCta = seg.tag === "button" || seg.tag === "a";

                return (
                  <div
                    key={i}
                    className="group rounded-md p-2.5 transition-colors hover:bg-surface-2"
                    style={{ border: "1px solid transparent" }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon size={10} style={{ color: isCta ? "hsl(var(--accent))" : "hsl(var(--text-ghost))" }} />
                      <span
                        className="text-[9px] uppercase tracking-[2.5px]"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: isCta ? "hsl(var(--accent))" : "hsl(var(--text-ghost))",
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {seg.text.length > 80 ? (
                      <Textarea
                        defaultValue={seg.text}
                        onBlur={(e) => updateText(seg.text, e.target.value)}
                        rows={3}
                        className="text-[12px] leading-relaxed resize-none border-0 p-0 min-h-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        style={{
                          background: "transparent",
                          color: "hsl(var(--text-primary))",
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: isHeading ? 600 : 400,
                          fontSize: isHeading ? 14 : 12,
                        }}
                      />
                    ) : (
                      <input
                        defaultValue={seg.text}
                        onBlur={(e) => updateText(seg.text, e.target.value)}
                        className="w-full bg-transparent border-0 outline-none p-0"
                        style={{
                          color: isCta ? "hsl(var(--accent))" : "hsl(var(--text-primary))",
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: isHeading ? 700 : isCta ? 600 : 400,
                          fontSize: isHeading ? 16 : isCta ? 13 : 12,
                          letterSpacing: isHeading ? "-0.02em" : "normal",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── COLORS TAB ─── */}
        <TabsContent value="colors" className="px-4 pb-4 mt-0">
          {allColors.length === 0 ? (
            <div className="py-8 text-center">
              <Palette size={20} className="mx-auto mb-2 text-txt-ghost" />
              <p className="text-body-sm text-txt-muted">Nenhuma cor encontrada</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 mt-3">
              {/* Solid colors */}
              {solidColors.length > 0 && (
                <div>
                  <span
                    className="text-[9px] uppercase tracking-[2.5px] mb-2 block"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-ghost))" }}
                  >
                    Cores sólidas
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {solidColors.map((c, i) => (
                      <ColorSwatch
                        key={`s-${i}`}
                        color={c.value}
                        count={c.count}
                        onReplace={(newColor) => replaceColor(c.value, newColor)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Alpha/transparent colors */}
              {alphaColors.length > 0 && (
                <div>
                  <span
                    className="text-[9px] uppercase tracking-[2.5px] mb-2 block"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-ghost))" }}
                  >
                    Transparências
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {alphaColors.map((c, i) => (
                      <ColorSwatch
                        key={`a-${i}`}
                        color={c.value}
                        count={c.count}
                        alpha
                        onReplace={(newColor) => replaceColor(c.value, newColor)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ─── CODE TAB ─── */}
        <TabsContent value="code" className="px-4 pb-4 mt-0">
          <div className="mt-3">
            <Textarea
              value={html}
              onChange={(e) => onChange(e.target.value)}
              className="text-[11px] leading-[1.6] min-h-[280px] resize-y border-0 focus-visible:ring-1 focus-visible:ring-accent"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: "hsl(var(--bg-base))",
                color: "hsl(var(--text-secondary))",
                borderRadius: 6,
                padding: "12px 14px",
              }}
              placeholder="HTML do slide..."
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Footer actions ── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[11px] text-txt-muted hover:text-txt-primary"
          onClick={onRestore}
        >
          <RotateCcw size={12} /> Restaurar original
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-[11px]"
          style={{
            background: "hsl(var(--accent))",
            color: "hsl(var(--text-inverse))",
            borderRadius: 6,
          }}
          onClick={onSave}
          disabled={loading}
        >
          {loading ? <span className="animate-spin"><Save size={12} /></span> : <Save size={12} />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
};

/* ── Color Swatch Component ── */
function ColorSwatch({
  color, count, alpha, onReplace,
}: {
  color: string; count: number; alpha?: boolean; onReplace: (c: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(color);

  const handleBlur = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== color) {
      onReplace(value.trim());
    }
  };

  return (
    <div
      className="flex items-center gap-2.5 p-2 rounded-md transition-colors hover:bg-surface-2 group"
      style={{ border: "1px solid hsl(var(--border-subtle))" }}
    >
      {/* Swatch with optional checkerboard */}
      <label className="relative flex-shrink-0 cursor-pointer">
        <div
          className="w-7 h-7 rounded-md"
          style={{
            backgroundImage: alpha ? checkerboard : undefined,
            backgroundSize: alpha ? "16px 16px" : undefined,
            border: "1px solid hsl(var(--border-strong))",
          }}
        >
          <div
            className="w-full h-full rounded-md"
            style={{ background: color }}
          />
        </div>
        <input
          type="color"
          defaultValue={color.startsWith("#") && color.length <= 7 ? color : "#000000"}
          onChange={(e) => {
            setValue(e.target.value);
            onReplace(e.target.value);
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>

      {/* Value + count */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleBlur()}
            autoFocus
            className="w-full bg-transparent border-0 outline-none text-[11px] p-0"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "hsl(var(--text-primary))",
            }}
          />
        ) : (
          <button
            onClick={() => { setEditing(true); setValue(color); }}
            className="text-left w-full truncate text-[11px] transition-colors"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "hsl(var(--text-secondary))",
            }}
          >
            {color}
          </button>
        )}
        <span
          className="text-[9px] block"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "hsl(var(--text-ghost))",
          }}
        >
          {count}× usado
        </span>
      </div>
    </div>
  );
}
