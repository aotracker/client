import "server-only";

import catalogEn from "../../../data/item-names.json";
import catalogEs from "../../../data/item-names.es.json";
import { parseItemType, itemIconIdentifier } from "@/lib/item-icons";
import { formatItemName } from "@/lib/utils";
import {
  DEFAULT_LOCALE,
  getLocaleDefinition,
  type AppLocale,
  isAppLocale,
} from "@/i18n/locales";

type ItemNamesCatalog = {
  locale: string;
  names: Record<string, string>;
  count: number;
  updatedAt?: string;
};

const CATALOGS: Record<AppLocale, ItemNamesCatalog> = {
  en: catalogEn as ItemNamesCatalog,
  es: catalogEs as ItemNamesCatalog,
};

function resolveAppLocale(locale?: string | null): AppLocale {
  if (locale && isAppLocale(locale)) return locale;
  return DEFAULT_LOCALE;
}

export function getCatalogItemName(
  type: string,
  locale?: string | null
): string | null {
  const appLocale = resolveAppLocale(locale);
  const identifier = itemIconIdentifier(type);
  const { baseName } = parseItemType(type);
  const names = CATALOGS[appLocale]?.names ?? CATALOGS.en.names;
  const enNames = CATALOGS.en.names;

  return (
    names[identifier] ??
    names[baseName] ??
    enNames[identifier] ??
    enNames[baseName] ??
    null
  );
}

function stripTier(name: string, locale: AppLocale): string {
  const def = getLocaleDefinition(locale);
  let result = name;
  if (def.tierPrefixPattern) {
    result = result.replace(def.tierPrefixPattern, "");
  }
  if (def.tierSuffixPattern) {
    result = result.replace(def.tierSuffixPattern, "");
  }
  return result;
}

/** Catalog name without Adept's/Master's/etc. — for tier-agnostic build labels. */
export function getItemFamilyDisplayName(
  type: string,
  locale?: string | null
): string | null {
  const appLocale = resolveAppLocale(locale);
  const name = getCatalogItemName(type, appLocale);
  if (!name) return null;
  return stripTier(name, appLocale);
}

export function formatItemTooltip(
  type: string,
  locale?: string | null
): string {
  const { tier, enchantment } = parseItemType(type);
  const name = getCatalogItemName(type, locale) ?? formatItemName(type);
  return `${name} (${tier}.${enchantment})`;
}

export function getItemCatalogMeta(locale?: string | null) {
  const appLocale = resolveAppLocale(locale);
  const catalog = CATALOGS[appLocale] ?? CATALOGS.en;
  return {
    locale: catalog.locale,
    count: catalog.count,
    updatedAt: catalog.updatedAt,
  };
}
