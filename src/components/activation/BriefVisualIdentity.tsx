import { SectionLabel } from "@/components/ui/SectionLabel";

interface BriefVisualIdentityProps {
  brandColors: string;
  typography: string;
  visualStyle: string;
  onChange: (field: "brand_colors" | "typography" | "visual_style", value: string) => void;
  highlightClass: (field: string) => string;
}

export const BriefVisualIdentity = ({
  brandColors,
  typography,
  visualStyle,
  onChange,
  highlightClass,
}: BriefVisualIdentityProps) => {
  return (
    <div className="space-y-5">
      <SectionLabel>Identidade Visual</SectionLabel>

      <div>
        <label className="field-label">Cores da marca</label>
        <textarea
          value={brandColors}
          onChange={(e) => onChange("brand_colors", e.target.value)}
          rows={3}
          className={`${highlightClass("brand_colors")} field-textarea`}
          placeholder="Ex: Primária #FF5733, Secundária #2D3436, Acento #00B894. Descreva a paleta e como usar cada cor."
        />
        <span
          className="text-[10px] mt-1 block"
          style={{ color: "hsl(var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          Inclua códigos hex, nomes das cores e regras de uso (dominante, suporte, acento/CTA)
        </span>
      </div>

      <div>
        <label className="field-label">Tipografia</label>
        <textarea
          value={typography}
          onChange={(e) => onChange("typography", e.target.value)}
          rows={3}
          className={`${highlightClass("typography")} field-textarea`}
          placeholder="Ex: Títulos em Montserrat Bold, corpo em Open Sans Regular. Tamanho mínimo 28px para mobile."
        />
        <span
          className="text-[10px] mt-1 block"
          style={{ color: "hsl(var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          Fontes, pesos, hierarquia (headline, sub, corpo, CTA)
        </span>
      </div>

      <div>
        <label className="field-label">Estilo visual / Moodboard</label>
        <textarea
          value={visualStyle}
          onChange={(e) => onChange("visual_style", e.target.value)}
          rows={4}
          className={`${highlightClass("visual_style")} field-textarea`}
          placeholder="Ex: Estilo clean e minimalista, fotografia lifestyle com luz natural, texturas orgânicas. Evitar sombras pesadas e gradientes neon."
        />
        <span
          className="text-[10px] mt-1 block"
          style={{ color: "hsl(var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          Direção visual, mood, referências estéticas, o que evitar
        </span>
      </div>
    </div>
  );
};
