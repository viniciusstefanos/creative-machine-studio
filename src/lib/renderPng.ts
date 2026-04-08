import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

/** Extract font families from HTML and return Google Fonts URL */
function buildGoogleFontsUrl(html: string): string | null {
  const fontFamilyRegex = /font-family:\s*'([^']+)'/gi;
  const families = new Set<string>();
  let match;
  while ((match = fontFamilyRegex.exec(html)) !== null) {
    const name = match[1].trim();
    if (["Helvetica Neue", "Helvetica", "Arial", "sans-serif", "serif", "monospace", "system-ui"].includes(name)) continue;
    families.add(name);
  }
  if (families.size === 0) families.add("Inter");
  const params = Array.from(families)
    .map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export async function renderHtmlToPng(
  htmlContent: string,
  width: number,
  height: number
): Promise<string> {
  const fontsUrl = buildGoogleFontsUrl(htmlContent);

  // Use an offscreen iframe to fully isolate from the app's global CSS
  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${width}px;height:${height}px;border:none;opacity:0;pointer-events:none;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8">
${fontsUrl ? `<link rel="stylesheet" href="${fontsUrl}">` : ""}
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
button,a,[role="button"]{display:inline-flex;align-items:center;justify-content:center;text-align:center}
</style>
</head><body style="width:${width}px;height:${height}px;overflow:hidden;margin:0;padding:0">
${htmlContent}
</body></html>`);
    doc.close();

    // Wait for iframe load
    await new Promise<void>((resolve) => {
      if (doc.readyState === "complete") {
        resolve();
      } else {
        iframe.addEventListener("load", () => resolve(), { once: true });
      }
    });

    // Wait for fonts (max 3s)
    await Promise.race([
      doc.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
    // Extra small delay for rendering
    await new Promise(resolve => setTimeout(resolve, 150));

    const canvas = await html2canvas(doc.body, {
      width,
      height,
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    return canvas.toDataURL("image/png", 1.0);
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function uploadPng(
  assetId: string,
  slideIndex: number,
  dataUrl: string
): Promise<string | null> {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `slide-${slideIndex}.png`, { type: "image/png" });
  const path = `${assetId}/slides/${slideIndex}.png`;

  const { error } = await supabase.storage
    .from("assets")
    .upload(path, file, { upsert: true });

  if (error) {
    console.error("PNG upload error:", error);
    return null;
  }

  const { data } = supabase.storage.from("assets").getPublicUrl(path);
  return data.publicUrl;
}
