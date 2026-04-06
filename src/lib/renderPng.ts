import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

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
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
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
