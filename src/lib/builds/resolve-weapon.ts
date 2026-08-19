import "server-only";

import { itemFamilyKey } from "@/lib/item-icons";
import { getItemFamilyDisplayName } from "@/lib/items/catalog";
import { listMainHandFamilyKeys } from "@/lib/items/item-meta";
import { LOCALE_DEFINITIONS } from "@/i18n/locales";
import { weaponNameSlug } from "@/lib/builds/weapon-slug";

const WEAPON_FAMILY_RE = /^[A-Za-z0-9_]{1,64}$/;

type WeaponNameIndex = {
  familyKeys: Set<string>;
  slugToFamily: Map<string, string>;
};

let cachedIndex: WeaponNameIndex | null = null;

function buildWeaponNameIndex(): WeaponNameIndex {
  const familyKeys = new Set(listMainHandFamilyKeys());
  const slugToFamily = new Map<string, string>();

  const locales = [
    ...LOCALE_DEFINITIONS.filter((locale) => locale.default),
    ...LOCALE_DEFINITIONS.filter((locale) => !locale.default),
  ];

  for (const locale of locales) {
    for (const familyKey of familyKeys) {
      const name = getItemFamilyDisplayName(`T8_${familyKey}`, locale.code);
      if (!name) continue;
      const slug = weaponNameSlug(name);
      if (!slug || slugToFamily.has(slug)) continue;
      slugToFamily.set(slug, familyKey);
    }
  }

  for (const familyKey of familyKeys) {
    const slug = weaponNameSlug(familyKey);
    if (!slug || slugToFamily.has(slug)) continue;
    slugToFamily.set(slug, familyKey);
  }

  return { familyKeys, slugToFamily };
}

function weaponNameIndex(): WeaponNameIndex {
  if (!cachedIndex) cachedIndex = buildWeaponNameIndex();
  return cachedIndex;
}

function decodeWeaponParam(value: string): string {
  const plusAsSpace = value.replace(/\+/g, " ").trim();
  try {
    return decodeURIComponent(plusAsSpace).trim();
  } catch {
    return plusAsSpace;
  }
}

/**
 * Resolve `?weapon=` to a main-hand family key.
 * Accepts English/Spanish display names ("Hallowfall", "Heavy Mace") and
 * legacy Albion family keys (`MAIN_HOLYSTAFF_AVALON`, `T8_2H_LONGBOW@3`).
 */
export function resolveMetaWeapon(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = decodeWeaponParam(value);
  if (!trimmed || trimmed.length > 80) return null;

  const { familyKeys, slugToFamily } = weaponNameIndex();
  const family = itemFamilyKey(trimmed);
  if (family && WEAPON_FAMILY_RE.test(family) && familyKeys.has(family)) {
    return family;
  }

  const slug = weaponNameSlug(trimmed);
  if (!slug) return null;
  return slugToFamily.get(slug) ?? null;
}
