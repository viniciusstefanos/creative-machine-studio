interface StatusBadgeProps {
  status: string;
}

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: "var(--status-draft)", label: "Rascunho" },
  review: { color: "var(--status-review)", label: "Em revisão" },
  approved: { color: "var(--status-approved)", label: "Aprovado" },
  rejected: { color: "var(--status-rejected)", label: "Rejeitado" },
  scheduled: { color: "var(--status-scheduled)", label: "Agendado" },
  published: { color: "var(--status-published)", label: "Publicado" },
  generating: { color: "var(--status-generating)", label: "Gerando" },
  active: { color: "var(--status-approved)", label: "Ativo" },
  paused: { color: "var(--status-review)", label: "Pausado" },
  done: { color: "var(--status-draft)", label: "Concluído" },
  failed: { color: "var(--status-rejected)", label: "Falhou" },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusMap[status] || { color: "var(--status-draft)", label: status };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: `color-mix(in srgb, ${config.color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${config.color} 25%, transparent)`,
        color: config.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: config.color }}
      />
      {config.label}
    </span>
  );
};
