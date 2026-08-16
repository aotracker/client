import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import type { FeedRegion } from "@/lib/region-params";
import { formatFame, regionLabel } from "@/lib/utils";
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

/** e.g. "PlayerName — Albion Online Americas Player" */
export function albionEntityTitle(
  name: string,
  kind: SeoEntityKind,
  region: string
): string {
  const kindLabel =
    kind === "player"
      ? "Player"
      : kind === "guild"
        ? "Guild"
        : kind === "alliance"
          ? "Alliance"
          : kind === "kill"
            ? "Kill"
            : "Battle";
  return `${name} — Albion Online ${regionLabel(region)} ${kindLabel}`;
}

function joinParts(parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export function playerSeoDescription(input: {
  name: string;
  region: string;
  killFame: number | null | undefined;
  deathFame: number | null | undefined;
  fameRatio?: string | null;
  guildName?: string | null;
  allianceName?: string | null;
}): string {
  const region = regionLabel(input.region);
  const affiliation = joinParts([
    input.guildName ? `in guild ${input.guildName}` : null,
    input.allianceName ? `(alliance ${input.allianceName})` : null,
  ]);

  const stats = joinParts([
    `${formatFame(input.killFame)} kill fame`,
    `${formatFame(input.deathFame)} death fame`,
    input.fameRatio ? `${input.fameRatio} K/D ratio` : null,
  ]);

  return joinParts([
    `${input.name} is an Albion Online ${region} player${affiliation ? ` ${affiliation}` : ""}.`,
    `Lifetime PvP stats: ${stats}.`,
    `View kills, deaths, gear, loot, and combat history on ${SITE_NAME}.`,
  ]);
}

export function guildSeoDescription(input: {
  name: string;
  region: string;
  killFame: number | null | undefined;
  deathFame: number | null | undefined;
  memberCount?: number | null;
  allianceName?: string | null;
  allianceTag?: string | null;
  founderName?: string | null;
  founded?: string | null;
}): string {
  const region = regionLabel(input.region);
  const alliance = input.allianceName
    ? input.allianceTag
      ? `[${input.allianceTag}] ${input.allianceName}`
      : input.allianceName
    : null;

  const stats = joinParts([
    input.memberCount != null
      ? `${input.memberCount.toLocaleString()} members`
      : null,
    `${formatFame(input.killFame)} kill fame`,
    `${formatFame(input.deathFame)} death fame`,
  ]);

  const founding = joinParts([
    input.founderName ? `Founded by ${input.founderName}` : null,
    input.founded ? `(${input.founded})` : null,
  ]);

  return joinParts([
    `${input.name} is an Albion Online ${region} guild${alliance ? ` in the ${alliance} alliance` : ""}.`,
    `${stats}.`,
    founding ? `${founding}.` : null,
    `Track top kills, Albion battles, members, and PvP stats on ${SITE_NAME}.`,
  ]);
}

export function allianceSeoDescription(input: {
  name: string;
  region: string;
  memberCount?: number | null;
  guildCount: number;
  killFame?: number | null;
  deathFame?: number | null;
  founderName?: string | null;
  founded?: string | null;
}): string {
  const region = regionLabel(input.region);

  const stats = joinParts([
    input.memberCount != null
      ? `${input.memberCount.toLocaleString()} members`
      : null,
    `${input.guildCount.toLocaleString()} guilds`,
    input.killFame != null ? `${formatFame(input.killFame)} kill fame` : null,
    input.deathFame != null ? `${formatFame(input.deathFame)} death fame` : null,
  ]);

  const founding = joinParts([
    input.founderName ? `Founded by ${input.founderName}` : null,
    input.founded ? `(${input.founded})` : null,
  ]);

  return joinParts([
    `${input.name} is an Albion Online ${region} alliance.`,
    `${stats}.`,
    founding ? `${founding}.` : null,
    `View member guilds, top kills, Albion battles, and PvP stats on ${SITE_NAME}.`,
  ]);
}

export function killSeoTitle(
  killerName: string,
  victimName: string,
  region: string,
  killFame?: number | null
): string {
  const famePart =
    killFame != null
      ? ` for ${formatFame(killFame)} fame`
      : "";
  return albionEntityTitle(
    `${killerName} killed ${victimName}${famePart}`,
    "kill",
    region
  );
}

export function killSeoDescription(input: {
  region: string;
  killerName: string;
  victimName: string;
  killerGuild?: string | null;
  victimGuild?: string | null;
  killFame: number | null | undefined;
  contentType?: string | null;
  participantCount?: number | null;
  battleId?: number | null;
  lootCount?: number | null;
}): string {
  const region = regionLabel(input.region);
  const killer = input.killerGuild
    ? `${input.killerName} (${input.killerGuild})`
    : input.killerName;
  const victim = input.victimGuild
    ? `${input.victimName} (${input.victimGuild})`
    : input.victimName;
  const content =
    input.contentType && input.contentType !== "GROUP"
      ? `${input.contentType} `
      : "";

  const details = joinParts([
    `${formatFame(input.killFame)} kill fame`,
    input.participantCount != null && input.participantCount > 0
      ? `${input.participantCount} participants`
      : null,
    input.lootCount != null && input.lootCount > 0
      ? `${input.lootCount} loot items`
      : null,
    input.battleId != null ? `battle #${input.battleId}` : null,
  ]);

  return joinParts([
    `${killer} killed ${victim} in an Albion Online ${region} ${content}PvP fight.`,
    `${details}.`,
    `View killer and victim gear, loot, assists, and kill details on ${SITE_NAME}.`,
  ]);
}

export function battleSeoTitle(battleId: number | string, region: string): string {
  return albionEntityTitle(`Battle #${battleId}`, "battle", region);
}

export function battleSeoDescription(input: {
  region: string;
  battleId: number | string;
  totalFame: number | null | undefined;
  totalKills?: number | null;
  totalPlayers?: number | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
}): string {
  const region = regionLabel(input.region);
  const start =
    input.startTime != null ? new Date(input.startTime) : null;
  const end = input.endTime != null ? new Date(input.endTime) : null;
  const durationMinutes =
    start &&
    end &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime())
      ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
      : null;

  const stats = joinParts([
    `${formatFame(input.totalFame)} total fame`,
    input.totalKills != null
      ? `${input.totalKills.toLocaleString()} kills`
      : null,
    input.totalPlayers != null
      ? `${input.totalPlayers.toLocaleString()} players`
      : null,
    durationMinutes != null
      ? `${durationMinutes.toLocaleString()} minute fight`
      : null,
  ]);

  return joinParts([
    `Albion Battle #${input.battleId} is an Albion Online ${region} PvP battle.`,
    `${stats}.`,
    `View participating alliances, guilds, players, and kill stats on ${SITE_NAME}.`,
  ]);
}

const NOINDEX_NOFOLLOW: Metadata["robots"] = { index: false, follow: false };
const NOINDEX_FOLLOW: Metadata["robots"] = { index: false, follow: true };
const INDEX_FOLLOW: Metadata["robots"] = { index: true, follow: true };

/** Append region to a feed page title when filtered. */
export function feedPageTitle(baseTitle: string, region: FeedRegion): string {
  if (region === "all") return baseTitle;
  return `${baseTitle} — ${regionLabel(region)}`;
}

/** Mention the active region in feed page descriptions. */
export function feedPageDescription(
  baseDescription: string,
  region: FeedRegion
): string {
  if (region === "all") return baseDescription;
  return `${baseDescription} Showing ${regionLabel(region)} region data.`;
}

export function buildFeedPageMetadata(options: {
  title: string;
  description: string;
  canonicalPath: string;
  region: FeedRegion;
  locale?: string;
}): Metadata {
  return buildPageMetadata({
    title: feedPageTitle(options.title, options.region),
    description: feedPageDescription(options.description, options.region),
    canonicalPath: options.canonicalPath,
    locale: options.locale,
  });
}

export function openGraphImagePath(canonicalPath: string): string {
  const normalized =
    canonicalPath.endsWith("/") ? canonicalPath.slice(0, -1) : canonicalPath;
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

export function pendingEntityMetadata(
  entityLabel: string,
  canonicalPath: string
): Metadata {
  return buildPageMetadata({
    title: `${entityLabel} not loaded yet`,
    description: `This ${entityLabel.toLowerCase()} is still being fetched from Albion Online.`,
    canonicalPath,
    robots: NOINDEX_NOFOLLOW,
  });
}

export function notFoundMetadata(): Metadata {
  return {
    title: "Not Found",
    robots: NOINDEX_NOFOLLOW,
  };
}

export { NOINDEX_NOFOLLOW, NOINDEX_FOLLOW, INDEX_FOLLOW };
