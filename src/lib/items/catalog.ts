import catalog from "../../../data/item-names.json";
import { parseItemType, itemIconIdentifier } from "@/lib/item-icons";

const itemNames = catalog.names as Record<string, string>;

export function getCatalogItemName(type: string): string | null {
  const identifier = itemIconIdentifier(type);
  const { baseName } = parseItemType(type);

  return itemNames[identifier] ?? itemNames[baseName] ?? null;
}

const TIER_NAME_PREFIX =
  /^(Beginner's|Novice's|Journeyman's|Adept's|Expert's|Master's|Grandmaster's|Elder's)\s+/i;

/** Catalog name without Adept's/Master's/etc. — for tier-agnostic build labels. */
export function getItemFamilyDisplayName(type: string): string | null {
  const name = getCatalogItemName(type);
  if (!name) return null;
  return name.replace(TIER_NAME_PREFIX, "");
}

export function formatItemTooltip(type: string): string {
  const { tier, enchantment } = parseItemType(type);
  const name = getCatalogItemName(type) ?? formatFallbackItemName(type);
  return `${name} (${tier}.${enchantment})`;
}

function formatFallbackItemName(type: string): string {
  const { baseName } = parseItemType(type);
  return baseName
    .replace(/^T\d+_/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getItemCatalogMeta() {
  return {
    locale: catalog.locale,
    count: catalog.count,
    updatedAt: catalog.updatedAt,
  };
}
