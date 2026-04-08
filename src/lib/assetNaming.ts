const CATEGORY_ACRONYMS: Record<string, string> = {
  carousel: "CRS",
  static: "STC",
  stories: "STR",
  reels: "RLS",
  feed: "FED",
  video: "VID",
};

function getAcronym(category: string): string {
  const lower = category.toLowerCase();
  return CATEGORY_ACRONYMS[lower] || lower.slice(0, 3).toUpperCase();
}

function truncateHook(hook: string, maxWords = 5): string {
  const words = hook.trim().split(/\s+/).slice(0, maxWords);
  return words.join(" ");
}

export function buildAssetName(
  sequenceNumber: number,
  templateCategory: string,
  copyHook?: string | null,
): string {
  const id = String(sequenceNumber).padStart(3, "0");
  const acronym = getAcronym(templateCategory);
  const title = copyHook ? ` ${truncateHook(copyHook)}` : "";
  return `${id}-${acronym}${title}`;
}
