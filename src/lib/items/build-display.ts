import "server-only";

import { LOCALE_CODES } from "@/i18n/locales";
import { getCatalogItemName, getItemFamilyDisplayName } from "@/lib/items/catalog";
import { getBuildArmorClass, type ArmorClass } from "@/lib/items/item-meta";
import { getWeaponRole, type WeaponRole } from "@/lib/items/weapon-roles";
import { formatItemName } from "@/lib/utils";

export type LocalizedNames = Record<string, string>;

export function itemDisplayNames(itemType: string): LocalizedNames {
  return Object.fromEntries(
    LOCALE_CODES.map((locale) => [
      locale,
      getCatalogItemName(itemType, locale) ?? formatItemName(itemType),
    ])
  );
}

export function itemFamilyNames(itemType: string): LocalizedNames {
  return Object.fromEntries(
    LOCALE_CODES.map((locale) => [
      locale,
      getItemFamilyDisplayName(itemType, locale) ??
        getCatalogItemName(itemType, locale) ??
        formatItemName(itemType),
    ])
  );
}

export function pickLocalizedName(
  names: LocalizedNames | undefined,
  locale: string,
  fallback: string
): string {
  return names?.[locale] ?? names?.en ?? fallback;
}

export function decorateBuildItem<T extends { itemType: string }>(item: T): T & {
  displayNames: LocalizedNames;
  familyNames: LocalizedNames;
} {
  return {
    ...item,
    displayNames: itemDisplayNames(item.itemType),
    familyNames: itemFamilyNames(item.itemType),
  };
}

export function buildPresentation(items: { slot?: string | null; itemType: string }[]): {
  titleNames: LocalizedNames;
  weaponRole: WeaponRole | null;
  armorClass: ArmorClass | null;
} {
  const mainHand = items.find((item) => item.slot === "MainHand");
  return {
    titleNames: mainHand ? itemFamilyNames(mainHand.itemType) : {},
    weaponRole: getWeaponRole(mainHand?.itemType),
    armorClass: getBuildArmorClass(items),
  };
}
