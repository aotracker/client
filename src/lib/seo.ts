import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import {
  DEFAULT_LOCALE,
  LOCALE_DEFINITIONS,
  withLocalePrefix,
} from "@/i18n/locales";

export const DEFAULT_DESCRIPTION =
  "Explore Albion Online PvP kills, battles, leaderboards, and meta builds. Player and guild profiles, gear, loot, and combat stats across all regions.";

export const HOME_PAGE_TITLE = "Albion Online PvP Stats, Battles & Leaderboards";

export type EntityType = "player" | "guild" | "alliance" | "kill" | "battle";

export type SeoEntityKind = "player" | "guild" | "alliance" | "kill" | "battle";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Unprefixed paths for next-intl `Link` (locale added by the navigation helpers). */
export function playerPath(region: string, name: string): string {
  return `/player/${region}/${encodeURIComponent(name)}`;
}

export function guildPath(region: string, name: string): string {
  return `/guild/${region}/${encodeURIComponent(name)}`;
}

export function alliancePath(region: string, allianceId: string): string {
  return `/alliance/${region}/${encodeURIComponent(allianceId)}`;
}

export function allianceFeudPath(
  region: string,
  allianceAId: string,
  allianceBId: string
): string {
  return `/alliance-feud/${region}/${encodeURIComponent(allianceAId)}/${encodeURIComponent(allianceBId)}`;
}

export function feudPath(
  region: string,
  guildA: string,
  guildB: string
): string {
  return `/feud/${region}/${encodeURIComponent(guildA)}/${encodeURIComponent(guildB)}`;
}

export function entityPath(
  type: EntityType,
  region: string,
  idOrName: string | number
): string {
  if (type === "player") return playerPath(region, String(idOrName));
  if (type === "guild") return guildPath(region, String(idOrName));
  return `/${type}/${region}/${idOrName}`;
}

export function entityCanonical(
  type: EntityType,
  region: string,
  id: string | number,
  locale: string = DEFAULT_LOCALE
): string {
  return absoluteUrl(withLocalePrefix(locale, entityPath(type, region, id)));
}

/** hreflang map for a locale-stripped internal path (e.g. `/player/americas/Name`). */
export function languageAlternates(
  path: string
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const def of LOCALE_DEFINITIONS) {
    languages[def.code] = absoluteUrl(withLocalePrefix(def.code, path));
  }
  languages["x-default"] = absoluteUrl(
    withLocalePrefix(DEFAULT_LOCALE, path)
  );
  return languages;
}

const NOINDEX_NOFOLLOW: Metadata["robots"] = { index: false, follow: false };
const NOINDEX_FOLLOW: Metadata["robots"] = { index: false, follow: true };
const INDEX_FOLLOW: Metadata["robots"] = { index: true, follow: true };

export function openGraphImagePath(canonicalPath: string): string {
  const pathname = canonicalPath.split("?")[0] ?? canonicalPath;
  const normalized = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return `${normalized}/opengraph-image`;
}

export function buildPageMetadata(options: {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: Metadata["robots"];
  openGraphType?: "website" | "article" | "profile";
  /** When false, omit auto-generated opengraph-image (e.g. root layout). */
  includeOpenGraphImage?: boolean;
  /** App locale for OG locale + hreflang (defaults to English). */
  locale?: string;
}): Metadata {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const localeDef =
    LOCALE_DEFINITIONS.find((l) => l.code === locale) ??
    LOCALE_DEFINITIONS.find((l) => l.code === DEFAULT_LOCALE)!;
  const localizedPath = withLocalePrefix(locale, options.canonicalPath);
  const url = absoluteUrl(localizedPath);
  const robots = options.robots ?? INDEX_FOLLOW;
  const ogType = options.openGraphType ?? "website";
  const includeImage = options.includeOpenGraphImage ?? true;
  const ogImagePath = openGraphImagePath(localizedPath);
  const ogImageUrl = absoluteUrl(ogImagePath);
  const ogImage = includeImage
    ? {
        url: ogImageUrl,
        secureUrl: ogImageUrl,
        width: 1200,
        height: 630,
        alt: options.title,
        type: "image/png",
      }
    : null;
  const alternateLocale = LOCALE_DEFINITIONS.filter(
    (def) => def.code !== localeDef.code
  ).map((def) => def.ogLocale);

  return {
    title: options.title,
    description: options.description,
    alternates: {
      canonical: url,
      languages: languageAlternates(options.canonicalPath),
    },
    robots,
    openGraph: {
      title: options.title,
      description: options.description,
      url,
      siteName: SITE_NAME,
      type: ogType,
      locale: localeDef.ogLocale,
      ...(alternateLocale.length > 0 ? { alternateLocale } : {}),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      ...(ogImage ? { images: [ogImageUrl] } : {}),
    },
  };
}

export function notFoundMetadata(): Metadata {
  return {
    title: "Not Found",
    robots: NOINDEX_NOFOLLOW,
  };
}

export { NOINDEX_NOFOLLOW, NOINDEX_FOLLOW, INDEX_FOLLOW };
