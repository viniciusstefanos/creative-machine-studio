import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface ConfirmGenerateProps {
  copies: any[];
  selectedCopy: string | null;
  selectedTemplate: any | null;
  renderConfig: Record<string, any>;
  imagePrompt: string;
  templateUsesImage: boolean;
  useClaude: boolean;
  setUseClaude: (v: boolean) => void;
  generating: boolean;
  onGenerate: () => void;
  onBack: () => void;
}

export const ConfirmGenerate = ({
  copies,
  selectedCopy,
  selectedTemplate,
  renderConfig,
  imagePrompt,
  templateUsesImage,
  useClaude,
  setUseClaude,
  generating,
  onGenerate,
  onBack,
}: ConfirmGenerateProps) => (
  <div>
    <div className="section-label--ruled mb-4">
      <SectionLabel>Confirmar e Gerar</SectionLabel>
    </div>
    <div className="card-base">
      <div className="space-y-4">
        <div>
          <span className="text-mono-label">Copy selecionado</span>
          <p className="text-body mt-1 line-clamp-2">
            {copies.find((c) => c.id === selectedCopy)?.hook || "—"}
          </p>
        </div>
        <div>
          <span className="text-mono-label">Template</span>
          <p className="text-body mt-1">
            {selectedTemplate?.name} ({selectedTemplate?.width_px}×{selectedTemplate?.height_px}px)
          </p>
        </div>
        {templateUsesImage && imagePrompt && (
          <div>
            <span className="text-mono-label">Prompt de imagem</span>
            <p className="text-caption mt-1 line-clamp-3 font-mono">{imagePrompt}</p>
          </div>
        )}
        {Object.keys(renderConfig).length > 0 && (
          <div>
            <span className="text-mono-label">Configurações</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(renderConfig).map(([key, val]) => (
                <span key={key} className="text-mono px-2 py-1 rounded bg-surface-2 text-txt-secondary">
                  {key}: {String(val)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6 items-center pt-4 border-t border-line-subtle">
        <Button variant="ghost" onClick={onBack}>← Voltar</Button>
        <button
          onClick={() => setUseClaude(!useClaude)}
          className={`flex items-center gap-2 text-mono px-3 py-2 rounded-md transition-all border ${
            useClaude ? "bg-accent-dim text-accent border-accent" : "bg-surface-2 text-txt-muted border-line"
          }`}
        >
          <div className={`w-3 h-3 rounded-full ${useClaude ? "bg-accent" : "bg-line-strong"}`} />
          Claude (Anthropic)
        </button>
        <Button onClick={onGenerate} disabled={generating} className="gap-2 ml-auto">
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "Gerando..." : "Gerar peça com IA"}
        </Button>
      </div>
    </div>
  </div>
);
