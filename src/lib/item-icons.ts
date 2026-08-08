import manifest from "../../data/item-icon-manifest.json";

const RENDER_BASE = "https://render.albiononline.com/v1/item";
const LOCAL_ICON_PREFIX = "/item-icons";
const CDN_BASE = process.env.NEXT_PUBLIC_ITEM_ICON_CDN?.replace(/\/$/, "");

export function parseItemType(type: string): {
  baseName: string;
  tier: number;
  enchantment: number;
} {
  const [base, enchant] = type.split("@");
  const tierMatch = base.match(/T(\d+)/);
  return {
    baseName: base,
    tier: tierMatch ? parseInt(tierMatch[1], 10) : 0,
    enchantment: enchant ? parseInt(enchant, 10) : 0,
  };
}

/**
 * Family key for grouping the same gear across tiers/enchantments.
 * e.g. T7_SHOES_LEATHER_SET2@2 and T6_SHOES_LEATHER_SET2@3 → SHOES_LEATHER_SET2
 * Quality is never part of the key.
 */
export function itemFamilyKey(type: string): string {
  const { baseName } = parseItemType(type);
  return baseName.replace(/^T\d+_/, "");
}

/** Albion quality: 1 Normal … 4 Excellent … 5 Masterpiece. */
export const ITEM_QUALITY_EXCELLENT = 4;

/**
 * Canonical display type for build meta: always T8.0 of the item family.
 * e.g. T6_MAIN_SWORD@2 → T8_MAIN_SWORD
 */
export function canonicalizeItemType(type: string): string {
  const family = itemFamilyKey(type);
  if (!family) return type;
  return `T8_${family}`;
}

export function normalizeItemQuality(quality: number | null | undefined): number {
  const q = quality ?? 1;
  if (!Number.isFinite(q) || q < 1) return 1;
  if (q > 5) return 5;
  return Math.round(q);
}

/** Stable filename key for cached PNGs (tier/enchant/quality). */
export function itemIconCacheKey(
  type: string,
  quality: number | null | undefined = 1
): string {
  const { baseName, enchantment } = parseItemType(type);
  const q = normalizeItemQuality(quality);
  const enchantSuffix = enchantment > 0 ? `@${enchantment}` : "";
  return `${baseName}${enchantSuffix}_q${q}`;
}

export function itemIconIdentifier(type: string): string {
  const { baseName, enchantment } = parseItemType(type);
  return enchantment > 0 ? `${baseName}@${enchantment}` : baseName;
}

const cachedKeys = new Set(manifest.keys);

export function isItemIconCached(
  type: string,
  quality: number | null | undefined = 1
): boolean {
  return cachedKeys.has(itemIconCacheKey(type, quality));
}

/** Albion render service URL (enchantment in path, quality as query param). */
export function itemIconRemoteUrl(
  type: string,
  quality: number | null | undefined = 1,
  size = 128
): string {
  const identifier = itemIconIdentifier(type);
  const q = normalizeItemQuality(quality);
  const params = new URLSearchParams({
    quality: String(q),
    size: String(size),
  });
  return `${RENDER_BASE}/${encodeURIComponent(identifier)}.png?${params.toString()}`;
}

export function itemIconLocalPath(
  type: string,
  quality: number | null | undefined = 1
): string {
  const key = itemIconCacheKey(type, quality);
  const path = `${LOCAL_ICON_PREFIX}/${key}.png`;
  if (CDN_BASE) {
    return `${CDN_BASE}/${key}.png`;
  }
  return path;
}

/** Prefer local/CDN cache when available; otherwise Albion render API. */
export function itemIconUrl(
  type: string,
  quality: number | null | undefined = 1
): string {
  if (isItemIconCached(type, quality)) {
    return itemIconLocalPath(type, quality);
  }
  return itemIconRemoteUrl(type, quality);
}

export function getCachedItemIconKeys(): string[] {
  return [...cachedKeys];
}
