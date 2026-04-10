import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface SelectCopyProps {
  copies: any[];
  selectedCopy: string | null;
  onSelect: (id: string) => void;
}

export const SelectCopy = ({ copies, selectedCopy, onSelect }: SelectCopyProps) => (
  <div>
    <div className="section-label--ruled mb-4">
      <SectionLabel>Copies Aprovados</SectionLabel>
    </div>
    {copies.length === 0 ? (
      <div className="empty-state card-base">
        <p className="empty-state__title">Nenhum copy aprovado</p>
        <p className="empty-state__desc">Aprove um copy antes de criar uma peça.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3">
        {copies.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`card-base card-interactive text-left transition-all duration-100 ${
              selectedCopy === c.id ? "!border-accent !bg-accent-surface" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-mono-label">{c.type} · {c.channel} · v{c.version}</span>
              <StatusBadge status={c.status} />
            </div>
            <p className="text-body line-clamp-2">{c.hook || c.body || "Sem conteúdo"}</p>
          </button>
        ))}
      </div>
    )}
  </div>
);
