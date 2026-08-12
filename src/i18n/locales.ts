/**
 * Single source of truth for app locales.
 * To add a language: append an entry here, add messages/{code}.json,
 * then re-run `npm run vm:items:catalog`.
 */

export type AppLocaleCode = "en" | "es";

export type LocaleDefinition = {
  code: AppLocaleCode;
  /** When true, URLs omit the locale prefix (localePrefix: as-needed). */
  default?: boolean;
  /** Native language name shown in the language selector. */
  label: string;
  htmlLang: string;
  ogLocale: string;
  /** Key in ao-bin-dumps LocalizedNames. */
  albionLocale: string;
  /**
   * Strip tier rank from catalog display names for family labels.
   * English uses a leading "Adept's …"; Spanish uses a trailing "… del iniciado".
   */
  tierPrefixPattern?: RegExp;
  tierSuffixPattern?: RegExp;
};

export const LOCALE_DEFINITIONS = [
  {
    code: "en",
    default: true,
    label: "English",
    htmlLang: "en",
    ogLocale: "en_US",
    albionLocale: "EN-US",
    tierPrefixPattern:
      /^(Beginner's|Novice's|Journeyman's|Adept's|Expert's|Master's|Grandmaster's|Elder's)\s+/i,
  },
  {
    code: "es",
    label: "Español",
    htmlLang: "es",
    ogLocale: "es_ES",
    albionLocale: "ES-ES",
    tierSuffixPattern:
      /\s+del (?:principiante|novato|aprendiz|obrero|iniciado|experto|maestro|gran maestro|anciano)$/i,
  },
] as const satisfies readonly LocaleDefinition[];

export type AppLocale = (typeof LOCALE_DEFINITIONS)[number]["code"];

export const LOCALE_CODES = LOCALE_DEFINITIONS.map((l) => l.code) as [
  AppLocale,
  ...AppLocale[],
];

export const DEFAULT_LOCALE: AppLocale =
  LOCALE_DEFINITIONS.find((l) => "default" in l && l.default)?.code ??
  LOCALE_CODES[0];

export function isAppLocale(value: string): value is AppLocale {
  return (LOCALE_CODES as readonly string[]).includes(value);
}

export function getLocaleDefinition(code: string): LocaleDefinition {
  const found = LOCALE_DEFINITIONS.find((l) => l.code === code);
  if (found) return found;
  return LOCALE_DEFINITIONS.find((l) => l.code === DEFAULT_LOCALE)!;
}

/** Path prefix for a locale (`""` for default, `"/es"` for Spanish). */
export function localePathPrefix(locale: string): string {
  const def = getLocaleDefinition(locale);
  if (("default" in def && def.default) || def.code === DEFAULT_LOCALE) {
    return "";
  }
  return `/${def.code}`;
}

/** Prefix an internal path with the locale when needed. */
export function withLocalePrefix(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const prefix = localePathPrefix(locale);
  if (!prefix) return normalized === "" ? "/" : normalized;
  if (normalized === "/") return prefix;
  return `${prefix}${normalized}`;
}

/** Strip a leading locale segment from a pathname (`/es/battles` → `/battles`). */
export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/");
  // ["", "es", "battles"] or ["", "battles"]
  if (segments.length >= 2 && isAppLocale(segments[1]) && segments[1] !== DEFAULT_LOCALE) {
    const rest = segments.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }
  // Also strip explicit default locale if present (/en/...)
  if (segments.length >= 2 && segments[1] === DEFAULT_LOCALE) {
    const rest = segments.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}

/** Filename for the item-names catalog for an app locale. */
export function itemNamesFileForLocale(locale: string): string {
  const def = getLocaleDefinition(locale);
  if (("default" in def && def.default) || def.code === DEFAULT_LOCALE) {
    return "item-names.json";
  }
  return `item-names.${def.code}.json`;
}
