import { decodeBase64 } from "jsr:@std/encoding@1/base64";

/** Extract base64 image data from AI response (supports multiple formats) */
export function extractBase64FromResponse(data: any): string | null {
  const choice = data.choices?.[0];
  if (!choice) return null;

  // Check images array first (Lovable gateway format)
  const imgUrl = choice.message?.images?.[0]?.image_url?.url;
  if (imgUrl) return imgUrl.includes(",") ? imgUrl.split(",")[1] : imgUrl;

  // Check content array
  if (Array.isArray(choice.message?.content)) {
    for (const part of choice.message.content) {
      if (part.type === "image_url" && part.image_url?.url) {
        const url = part.image_url.url;
        return url.includes(",") ? url.split(",")[1] : url;
      }
      if (part.type === "image" && part.data) return part.data;
    }
  }

  // Check parts (Gemini native)
  if (Array.isArray(choice.message?.parts)) {
    for (const p of choice.message.parts) {
      if (p.inline_data?.data) return p.inline_data.data;
    }
  }

  return null;
}

/** Generate image via Lovable AI, upload to Supabase storage, return public URL */
export async function generateImage(
  prompt: string,
  lovableKey: string,
  supabase: any,
  assetId: string,
): Promise<string | null> {
  try {
    console.log("Image gen: sending request...");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: `Generate an image: ${prompt}` }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Image gen failed:", res.status, errText);
      return null;
    }
    const data = await res.json();
    const base64Data = extractBase64FromResponse(data);
    if (!base64Data) {
      console.error("No image data found in response.");
      return null;
    }

    const imageBytes = decodeBase64(base64Data);
    const filePath = `generated/${assetId}/${Date.now()}.png`;
    const { error: uploadErr } = await supabase.storage
      .from("assets")
      .upload(filePath, imageBytes, { contentType: "image/png", upsert: true });
    if (uploadErr) { console.error("Upload error:", uploadErr); return null; }
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(filePath);
    console.log("Image uploaded:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (e) {
    console.error("Image gen error:", e);
    return null;
  }
}
