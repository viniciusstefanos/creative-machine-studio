import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, Palette, Type, Code, X, Plus, Trash2 } from "lucide-react";

interface HtmlVisualEditorProps {
  html: string;
  onChange: (html: string) => void;
  onSave: () => void;
  onClose: () => void;
  onRestore: () => void;
  loading?: boolean;
}

// Extract all unique colors from HTML (hex, rgb, hsl, named)
function extractColors(html: string): string[] {
  const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;
  const hslRegex = /hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(?:,\s*[\d.]+\s*)?\)/g;
  const matches = new Set<string>();
  (html.match(hexRegex) || []).forEach(c => matches.add(c.toLowerCase()));
  (html.match(rgbRegex) || []).forEach(c => matches.add(c));
  (html.match(hslRegex) || []).forEach(c => matches.add(c));
  return Array.from(matches);
}

// Extract visible text segments from HTML
function extractTextSegments(html: string): { text: string; tag: string; full: string }[] {
  const segments: { text: string; tag: string; full: string }[] = [];
  // Match common text-holding tags
  const regex = /<(h[1-6]|p|span|div|a|button|li|td|th|strong|em|b|i|label|figcaption)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const innerText = match[3].replace(/<[^>]*>/g, "").trim();
    if (innerText.length > 0 && innerText.length < 500) {
      segments.push({ text: innerText, tag: match[1].toLowerCase(), full: match[0] });
    }
  }
  // Deduplicate by text
  const seen = new Set<string>();
  return segments.filter(s => {
    if (seen.has(s.text)) return false;
    seen.add(s.text);
    return true;
  });
}

const TAG_LABELS: Record<string, string> = {
  h1: "Título", h2: "Subtítulo", h3: "Heading 3", h4: "Heading 4",
  p: "Parágrafo", span: "Texto", div: "Bloco", a: "Link",
  button: "Botão", strong: "Negrito", em: "Itálico", b: "Negrito",
  li: "Item lista", label: "Label", figcaption: "Legenda",
};

export const HtmlVisualEditor = ({
  html, onChange, onSave, onClose, onRestore, loading,
}: HtmlVisualEditorProps) => {
  const [tab, setTab] = useState("text");
  const [colorReplacements, setColorReplacements] = useState<Record<string, string>>({});

  const colors = useMemo(() => extractColors(html), [html]);
  const textSegments = useMemo(() => extractTextSegments(html), [html]);

  const updateText = useCallback((oldText: string, newText: string) => {
    if (oldText === newText) return;
    // Replace text content while preserving tags
    const updated = html.replace(oldText, newText);
    onChange(updated);
  }, [html, onChange]);

  const applyColorReplacement = useCallback((oldColor: string, newColor: string) => {
    if (!newColor || oldColor === newColor) return;
    setColorReplacements(prev => ({ ...prev, [oldColor]: newColor }));
    // Replace all occurrences
    const escaped = oldColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const updated = html.replace(new RegExp(escaped, "gi"), newColor);
    onChange(updated);
  }, [html, onChange]);

  const currentColors = useMemo(() => extractColors(html), [html]);

  return (
    <div className="card-base space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-label">Editor visual</span>
        <Button variant="ghost" size="sm" onClick={onClose}><X size={14} /></Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full bg-surface-2">
          <TabsTrigger value="text" className="flex-1 gap-1.5 text-xs">
            <Type size={12} /> Textos
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex-1 gap-1.5 text-xs">
            <Palette size={12} /> Cores
          </TabsTrigger>
          <TabsTrigger value="code" className="flex-1 gap-1.5 text-xs">
            <Code size={12} /> HTML
          </TabsTrigger>
        </TabsList>

        {/* ─── TEXT TAB ─── */}
        <TabsContent value="text" className="space-y-2 mt-3">
          {textSegments.length === 0 ? (
            <p className="text-body-sm text-txt-muted">Nenhum texto encontrado no HTML.</p>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {textSegments.map((seg, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-mono text-txt-ghost text-[9px] uppercase tracking-widest">
                    {TAG_LABELS[seg.tag] || seg.tag}
                  </span>
                  {seg.text.length > 80 ? (
                    <Textarea
                      defaultValue={seg.text}
                      onBlur={(e) => updateText(seg.text, e.target.value)}
                      className="text-xs min-h-[60px] bg-base border-line-strong"
                      rows={2}
                    />
                  ) : (
                    <Input
                      defaultValue={seg.text}
                      onBlur={(e) => updateText(seg.text, e.target.value)}
                      className="text-xs h-8 bg-base border-line-strong"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── COLORS TAB ─── */}
        <TabsContent value="colors" className="space-y-2 mt-3">
          {currentColors.length === 0 ? (
            <p className="text-body-sm text-txt-muted">Nenhuma cor encontrada no HTML.</p>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {currentColors.map((color, i) => (
                <div key={`${color}-${i}`} className="flex items-center gap-3">
                  {/* Color swatch + native picker */}
                  <label className="relative flex-shrink-0 cursor-pointer">
                    <div
                      className="w-8 h-8 rounded-md border border-line-strong"
                      style={{ background: color }}
                    />
                    <input
                      type="color"
                      defaultValue={color.startsWith("#") && color.length <= 7 ? color : "#000000"}
                      onChange={(e) => applyColorReplacement(color, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                  {/* Editable hex/value */}
                  <Input
                    defaultValue={color}
                    onBlur={(e) => applyColorReplacement(color, e.target.value.trim())}
                    className="text-xs h-8 font-mono bg-base border-line-strong flex-1"
                    placeholder="#000000"
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── CODE TAB ─── */}
        <TabsContent value="code" className="mt-3">
          <Textarea
            value={html}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-xs min-h-[240px] bg-base border-line-strong"
            placeholder="HTML do slide..."
          />
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-line">
        <Button size="sm" className="gap-2" onClick={onSave} disabled={loading}>
          {loading ? <span className="animate-spin"><Save size={14} /></span> : <Save size={14} />}
          Salvar
        </Button>
        <Button variant="ghost" size="sm" className="gap-2" onClick={onRestore}>
          <RotateCcw size={14} /> Restaurar
        </Button>
      </div>
    </div>
  );
};
