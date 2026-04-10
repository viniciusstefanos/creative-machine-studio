/** Strip code fences and any markdown/explanation text around HTML */
export function extractHtml(raw: string): string {
  let s = raw.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();
  const startMatch = s.match(/(<(!DOCTYPE|html|head|body|div|section|link|style|meta)\b)/i);
  const endMatch = s.match(/.*(\/\s*(html|body|div|section|style)>)/is);
  if (startMatch?.index !== undefined && endMatch) {
    const endIdx = s.lastIndexOf(endMatch[2].startsWith("/") ? endMatch[2] : "</" + endMatch[2]);
    const lastClose = s.indexOf(">", endIdx) + 1;
    if (lastClose > startMatch.index) {
      s = s.substring(startMatch.index, lastClose);
    }
  }
  return s.trim();
}
