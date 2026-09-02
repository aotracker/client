import {
  itemIconCacheKey,
  itemIconIdentifier,
  normalizeItemQuality,
  parseItemType,
} from "./item-icon-keys";

export {
  ITEM_QUALITY_EXCELLENT,
  itemIconCacheKey,
  itemIconIdentifier,
  normalizeItemQuality,
  parseItemType,
} from "./item-icon-keys";

const RENDER_ITEM_BASE = "https://render.albiononline.com/v1/item";
const RENDER_SPELL_BASE = "https://render.albiononline.com/v1/spell";
const LOCAL_ICON_PREFIX = "/item-icons";
const CDN_BASE = process.env.NEXT_PUBLIC_ITEM_ICON_CDN?.replace(/\/$/, "");

/**
 * Family key for grouping the same gear across tiers/enchantments.
 * e.g. T7_SHOES_LEATHER_SET2@2 and T6_SHOES_LEATHER_SET2@3 → SHOES_LEATHER_SET2
 * Quality is never part of the key.
 */
export function itemFamilyKey(type: string): string {
  const { baseName } = parseItemType(type);
  return baseName.replace(/^T\d+_/, "");
}

/**
 * Canonical display type for build meta: always T8.0 of the item family.
 * e.g. T6_MAIN_SWORD@2 → T8_MAIN_SWORD
 */
export function canonicalizeItemType(type: string): string {
  const family = itemFamilyKey(type);
  if (!family) return type;
  return `T8_${family}`;
}

/**
 * Albion `/v1/item/{id}` 404s for some 2D-only items. Use a spell sprite when
 * game data has one; otherwise skip the remote URL so Next.js does not proxy a 404.
 */
function remoteIconTarget(
  type: string
): { kind: "item" | "spell"; id: string } | null {
  const identifier = itemIconIdentifier(type);
  const siege = identifier.match(/^(T\d+)_SIEGE_BANNER$/);
  if (siege) {
    return { kind: "spell", id: `${siege[1]}_RAID_BANNER_ITEM_SPELL` };
  }
  if (identifier === "QUESTITEM_TOKEN_SMUGGLER") {
    return null;
  }
  return { kind: "item", id: identifier };
}

/** Albion render service URL, or null when no public render exists. */
export function itemIconRemoteUrl(
  type: string,
  quality: number | null | undefined = 1,
  size = 128
): string | null {
  const target = remoteIconTarget(type);
  if (!target) return null;

  if (target.kind === "spell") {
    const params = new URLSearchParams({ size: String(size) });
    return `${RENDER_SPELL_BASE}/${encodeURIComponent(target.id)}.png?${params.toString()}`;
  }

  const q = normalizeItemQuality(quality);
  const params = new URLSearchParams({
    quality: String(q),
    size: String(size),
  });
  return `${RENDER_ITEM_BASE}/${encodeURIComponent(target.id)}.png?${params.toString()}`;
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

/**
 * Client-safe icon URL. Prefers the public CDN when configured; in development
 * uses `/item-icons/{key}.png` from the local cache; otherwise the Albion
 * render API. Does not consult the 23k-key icon manifest — that JSON must stay
 * out of client component bundles.
 */
export function itemIconUrl(
  type: string,
  quality: number | null | undefined = 1
): string {
  if (CDN_BASE) {
    return itemIconLocalPath(type, quality);
  }
  if (process.env.NODE_ENV === "development") {
    return itemIconLocalPath(type, quality);
  }
  return itemIconRemoteUrl(type, quality) ?? itemIconLocalPath(type, quality);
}
