import { itemFamilyKey } from "@/lib/item-icons";
import { weaponNameSlug } from "@/lib/builds/weapon-slug";

export const BUILD_DAYS = [1, 7, 14, 30] as const;
export type BuildDays = (typeof BUILD_DAYS)[number];

export const META_BUILD_SORTS = ["usage", "kd", "kills", "fame"] as const;
export type MetaBuildSort = (typeof META_BUILD_SORTS)[number];

export const META_BUILD_ROLE_FILTERS = [
  "all",
  "dps",
  "healer",
  "tank",
  "support",
] as const;
export type MetaBuildRoleFilter = (typeof META_BUILD_ROLE_FILTERS)[number];

export const META_BUILD_ARMOR_FILTERS = [
  "all",
  "plate",
  "leather",
  "cloth",
] as const;
export type MetaBuildArmorFilter = (typeof META_BUILD_ARMOR_FILTERS)[number];

const WEAPON_FAMILY_RE = /^[A-Za-z0-9_]{1,64}$/;

export function parseBuildDays(value: string | undefined): BuildDays {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 7 || parsed === 14 || parsed === 30) {
    return parsed;
  }
  return 30;
}

export function parseMetaBuildSort(value: string | undefined): MetaBuildSort {
  if (value && (META_BUILD_SORTS as readonly string[]).includes(value)) {
    return value as MetaBuildSort;
  }
  return "usage";
}

export function parseMetaBuildRole(
  value: string | undefined
): MetaBuildRoleFilter {
  if (value && (META_BUILD_ROLE_FILTERS as readonly string[]).includes(value)) {
    return value as MetaBuildRoleFilter;
  }
  return "all";
}

export function parseMetaBuildArmor(
  value: string | undefined
): MetaBuildArmorFilter {
  if (value && (META_BUILD_ARMOR_FILTERS as readonly string[]).includes(value)) {
    return value as MetaBuildArmorFilter;
  }
  return "all";
}

/**
 * Presence check for `?weapon=` (family key or friendly name).
 * Server filtering must use `resolveMetaWeapon` so names map to family keys.
 */
export function parseMetaWeapon(value: string | undefined): string | null {
  if (!value) return null;
  const plusAsSpace = value.replace(/\+/g, " ").trim();
  let trimmed = plusAsSpace;
  try {
    trimmed = decodeURIComponent(plusAsSpace).trim();
  } catch {
    trimmed = plusAsSpace;
  }
  if (!trimmed || trimmed.length > 80) return null;

  const family = itemFamilyKey(trimmed);
  if (family && WEAPON_FAMILY_RE.test(family)) return family;

  const slug = weaponNameSlug(trimmed);
  if (slug.length < 3) return null;
  return trimmed;
}
