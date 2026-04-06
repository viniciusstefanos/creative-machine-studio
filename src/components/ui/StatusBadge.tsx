interface StatusBadgeProps {
  status: string;
}

const statusMap: Record<string, { cssVar: string; label: string }> = {
  draft: { cssVar: "--status-draft", label: "Rascunho" },
  review: { cssVar: "--status-review", label: "Em revisão" },
  approved: { cssVar: "--status-approved", label: "Aprovado" },
  rejected: { cssVar: "--status-rejected", label: "Rejeitado" },
  scheduled: { cssVar: "--status-scheduled", label: "Agendado" },
  published: { cssVar: "--status-published", label: "Publicado" },
  generating: { cssVar: "--status-generating", label: "Gerando" },
  active: { cssVar: "--status-approved", label: "Ativo" },
  paused: { cssVar: "--status-review", label: "Pausado" },
  done: { cssVar: "--status-draft", label: "Concluído" },
  failed: { cssVar: "--status-rejected", label: "Falhou" },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusMap[status] || { cssVar: "--status-draft", label: status };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.5px",
        background: `color-mix(in srgb, hsl(var(${config.cssVar})) 10%, transparent)`,
        border: `1px solid color-mix(in srgb, hsl(var(${config.cssVar})) 30%, transparent)`,
        color: `hsl(var(${config.cssVar}))`,
      }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full shrink-0"
        style={{ background: `hsl(var(${config.cssVar}))` }}
      />
      {config.label}
    </span>
  );
};
