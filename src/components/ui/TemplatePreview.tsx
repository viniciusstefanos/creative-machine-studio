import { useMemo } from "react";

const AbstractPreview = ({ template }: { template: any }) => {
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

const ScaffoldPreview = ({ template }: { template: any }) => {
  const dim = template.aspect_ratio === "9:16"
    ? { w: 1080, h: 1920 }
    : template.aspect_ratio === "1:1"
    ? { w: 1080, h: 1080 }
    : { w: 1080, h: 1350 };

  const containerH = 140;
  const scale = containerH / dim.h;
  const containerW = Math.round(dim.w * scale);

  const filledHtml = useMemo(() => {
    let html = template.html_scaffold || "";
    html = html.replace(/\{\{hook\}\}/g, "Título de exemplo");
    html = html.replace(/\{\{body\}\}/g, "Texto de corpo para visualização do template.");
    html = html.replace(/\{\{cta\}\}/g, "Saiba mais");
    html = html.replace(/\{\{brand_color\}\}/g, "#00C9A7");
    html = html.replace(/\{\{image_url\}\}/g, "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23333' width='400' height='400'/%3E%3C/svg%3E");
    return html;
  }, [template.html_scaffold]);

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}</style></head><body style="margin:0;overflow:hidden;background:#111;width:${dim.w}px;height:${dim.h}px">${filledHtml}</body></html>`;

  return (
    <div className="flex items-center justify-center" style={{ height: containerH + 8 }}>
      <div
        className="rounded overflow-hidden border border-[hsl(var(--border-subtle))]"
        style={{ width: containerW, height: containerH }}
      >
        <iframe
          srcDoc={srcDoc}
          className="border-0 pointer-events-none"
          style={{
            width: dim.w,
            height: dim.h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          sandbox="allow-same-origin"
          title={template.name}
          tabIndex={-1}
        />
      </div>
    </div>
  );
};

const TemplatePreview = ({ template }: { template: any }) => {
  if (template.html_scaffold) {
    return <ScaffoldPreview template={template} />;
  }
  return <AbstractPreview template={template} />;
};

export { TemplatePreview };
