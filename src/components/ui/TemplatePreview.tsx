const TemplatePreview = ({ template }: { template: any }) => {
  const is916 = template.aspect_ratio === "9:16";
  const isCarousel = template.category === "carousel";
  const hasImage = template.generation_type?.includes("image");

  const containerH = 120;
  const containerW = is916 ? Math.round(containerH * (9 / 16)) : Math.round(containerH * (4 / 5));

  const bleedPct = is916 ? "13%" : "10%";

  if (isCarousel) {
    const cardW = Math.round((containerW - 8) / 1.2);
    return (
      <div className="flex items-center justify-center gap-1" style={{ height: containerH }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center border border-[hsl(var(--border-subtle))] rounded"
            style={{
              width: cardW,
              height: containerH - 16,
              background: i === 0
                ? "linear-gradient(135deg, hsl(var(--accent) / 0.15), hsl(var(--bg-surface3)))"
                : "hsl(var(--bg-surface3))",
              padding: "6px 4px",
              opacity: i === 2 ? 0.5 : 1,
            }}
          >
            {i === 0 ? (
              <>
                <div className="w-full h-1.5 rounded-full bg-[hsl(var(--accent)/0.6)] mb-1" />
                <div className="w-3/4 h-1 rounded-full bg-[hsl(var(--text-muted)/0.3)]" />
                <div className="text-[7px] mt-auto" style={{ color: "hsl(var(--accent))", fontFamily: "JetBrains Mono" }}>
                  HOOK
                </div>
              </>
            ) : i === 1 ? (
              <>
                <div className="w-full h-1 rounded-full bg-[hsl(var(--text-muted)/0.3)] mb-0.5" />
                <div className="w-full h-1 rounded-full bg-[hsl(var(--text-muted)/0.2)] mb-0.5" />
                <div className="w-2/3 h-1 rounded-full bg-[hsl(var(--text-muted)/0.2)]" />
              </>
            ) : (
              <>
                <div className="w-3/4 h-2 rounded bg-[hsl(var(--accent)/0.4)] mt-auto" />
                <div className="text-[7px] mt-1" style={{ color: "hsl(var(--text-muted))", fontFamily: "JetBrains Mono" }}>
                  CTA
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center" style={{ height: containerH }}>
      <div
        className="relative flex flex-col items-center justify-center border border-[hsl(var(--border-subtle))] rounded overflow-hidden"
        style={{
          width: containerW,
          height: containerH - 8,
          background: hasImage
            ? "linear-gradient(180deg, hsl(var(--bg-surface3)), hsl(var(--bg-surface2)))"
            : "linear-gradient(135deg, hsl(var(--accent)/0.1), hsl(var(--bg-surface3)))",
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 border-b border-dashed border-[hsl(var(--status-review)/0.3)]"
          style={{ height: bleedPct }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 border-t border-dashed border-[hsl(var(--status-review)/0.3)]"
          style={{ height: bleedPct }}
        />

        <div className="flex flex-col items-center gap-1 px-2" style={{ zIndex: 1 }}>
          {hasImage && (
            <div className="w-4 h-4 rounded bg-[hsl(var(--text-muted)/0.15)] mb-0.5 flex items-center justify-center">
              <span className="text-[6px]" style={{ color: "hsl(var(--text-muted))" }}>IMG</span>
            </div>
          )}
          <div className="w-full h-1.5 rounded-full bg-[hsl(var(--accent)/0.5)]" />
          <div className="w-3/4 h-1 rounded-full bg-[hsl(var(--text-muted)/0.3)]" />
          <div className="w-1/2 h-1 rounded-full bg-[hsl(var(--text-muted)/0.2)]" />
          <div className="w-2/3 h-1.5 rounded bg-[hsl(var(--accent)/0.3)] mt-1" />
        </div>

        <div
          className="absolute bottom-1 right-1 text-[7px]"
          style={{ color: "hsl(var(--text-ghost))", fontFamily: "JetBrains Mono" }}
        >
          {template.aspect_ratio}
        </div>
      </div>
    </div>
  );
};

export { TemplatePreview };
