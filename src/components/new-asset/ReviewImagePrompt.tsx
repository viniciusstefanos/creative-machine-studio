import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Eye, Pencil } from "lucide-react";

interface ReviewImagePromptProps {
  template: any;
  imagePrompt: string;
  setImagePrompt: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ReviewImagePrompt = ({ template, imagePrompt, setImagePrompt, onNext, onBack }: ReviewImagePromptProps) => (
  <div>
    <div className="section-label--ruled mb-4">
      <SectionLabel>Prompt de Imagem</SectionLabel>
    </div>
    <div className="card-base space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-heading mb-1">Validar prompt de geração</p>
          <p className="text-caption">Este prompt será enviado à IA para gerar a imagem. Edite livremente antes de confirmar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-txt-ghost" />
          <Pencil size={16} className="text-txt-ghost" />
        </div>
      </div>

      <div>
        <label className="field-label">Prompt base (do template)</label>
        <p className="text-caption mb-2 text-txt-ghost">{template?.image_prompt_template || "Sem template definido"}</p>
      </div>

      <div>
        <label className="field-label">Prompt preenchido (editável)</label>
        <Textarea
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          rows={8}
          className="bg-surface-1 border-line text-body font-mono text-sm"
          placeholder="Descreva a imagem que deseja gerar..."
        />
        <p className="text-caption mt-2">
          💡 A IA vai otimizar este prompt antes de gerar a imagem.
        </p>
      </div>

      <div className="card-base !bg-surface-2 !border-line-subtle">
        <p className="text-mono-label mb-2">Dicas para bons prompts</p>
        <ul className="text-caption space-y-1 list-disc list-inside">
          <li>Descreva o cenário e a pessoa em contexto real brasileiro</li>
          <li>Prefira estilo UGC/autêntico em vez de estúdio polido</li>
          <li>Mencione iluminação (ex: "luz natural dourada")</li>
          <li>Indique enquadramento: close, meio corpo, plano aberto</li>
          <li>Use referências sensoriais: texturas, cores, atmosfera</li>
        </ul>
      </div>
    </div>

    <div className="flex gap-3 mt-6">
      <Button variant="ghost" onClick={onBack}>← Voltar</Button>
      <Button onClick={onNext}>
        Continuar <ChevronRight size={14} className="ml-1" />
      </Button>
    </div>
  </div>
);
