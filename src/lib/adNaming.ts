/**
 * Nomenclatura padronizada para Campanhas, Conjuntos e Anúncios Meta Ads.
 * Delimitador: `-`
 */

const OBJ_MAP: Record<string, string> = {
  OUTCOME_AWARENESS: "AWARENESS",
  OUTCOME_TRAFFIC: "TRAF",
  OUTCOME_ENGAGEMENT: "ENGAGE",
  OUTCOME_LEADS: "LEADS",
  OUTCOME_SALES: "SALES",
};

const CATEGORY_MAP: Record<string, string> = {
  carousel: "CRS",
  static: "STC",
  stories: "STR",
  reels: "RLS",
  feed: "FED",
  video: "VID",
};

/**
 * Remove acentos, caracteres especiais, espaços → `-`, uppercase.
 */
export function sanitize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove diacríticos
    .replace(/[^a-zA-Z0-9\s-]/g, "")   // remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase();
}

/**
 * Campanha: {SLUG}-{NOME}-{OBJ}
 * Ex: BF26-BLACK-FRIDAY-TRAF
 */
export function buildCampaignName(
  activationSlug: string,
  campaignLabel: string,
  objective: string,
): string {
  const slug = sanitize(activationSlug);
  const label = sanitize(campaignLabel);
  const obj = OBJ_MAP[objective] || sanitize(objective);

  const parts = [slug, label, obj].filter(Boolean);
  return parts.join("-");
}

/**
 * Conjunto: {CAMPAIGN}-{SEGMENT}
 * Ex: BF26-BLACK-FRIDAY-TRAF-BROAD
 */
export function buildAdsetName(
  campaignName: string,
  segment: string = "BROAD",
): string {
  return `${campaignName}-${sanitize(segment)}`;
}

/**
 * Anúncio: {FMT}-{COPY_LETTER}-V{CREATIVE}
 * Ex: CRS-A-V1
 */
export function buildAdName(
  category: string,
  copyIndex: number,
  creativeIndex: number = 1,
): string {
  const fmt = CATEGORY_MAP[category?.toLowerCase()] || sanitize(category || "AD");
  const letter = String.fromCharCode(65 + copyIndex); // 0→A, 1→B, ...
  return `${fmt}-${letter}-V${creativeIndex}`;
}
