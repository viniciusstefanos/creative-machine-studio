import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

/** Extract font families from HTML and return Google Fonts URL */
function buildGoogleFontsUrl(html: string): string | null {
  const fontFamilyRegex = /font-family:\s*'([^']+)'/gi;
  const families = new Set<string>();
  let match;
  while ((match = fontFamilyRegex.exec(html)) !== null) {
    const name = match[1].trim();
    // Skip system/generic fonts
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
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: ${width}px; height: ${height}px; overflow: hidden;
  `;

  // Inject Google Fonts link
  const fontsUrl = buildGoogleFontsUrl(htmlContent);
  if (fontsUrl) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontsUrl;
    document.head.appendChild(link);
  }

  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // Wait for fonts to load (max 3s)
    await Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
    // Extra small delay for rendering
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(container, {
      width,
      height,
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    return canvas.toDataURL("image/png", 1.0);
  } finally {
    document.body.removeChild(container);
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
