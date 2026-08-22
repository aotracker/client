import "server-only";

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/site";
import type { FeedRegion } from "@/lib/region-params";
import { formatFame, regionLabel } from "@/lib/utils";
import {
  buildPageMetadata,
  NOINDEX_NOFOLLOW,
  type SeoEntityKind,
} from "@/lib/seo";

function joinParts(parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

async function resolveLocale(locale?: string): Promise<string> {
  return locale ?? (await getLocale());
}

export async function translatedRegionLabel(
  region: string,
  locale?: string
): Promise<string> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Common" });
  const key = `regions.${region}`;
  return t.has(key) ? t(key) : regionLabel(region);
}

export async function buildLocalizedPageMetadata(
  options: Parameters<typeof buildPageMetadata>[0]
): Promise<Metadata> {
  const locale = await resolveLocale(options.locale);
  return buildPageMetadata({ ...options, locale });
}

export async function buildFeedPageMetadata(options: {
  title: string;
  description: string;
  canonicalPath: string;
  region: FeedRegion;
  locale?: string;
}): Promise<Metadata> {
  const locale = await resolveLocale(options.locale);
  if (options.region === "all") {
    return buildPageMetadata({
      title: options.title,
      description: options.description,
      canonicalPath: options.canonicalPath,
      locale,
    });
  }

  const t = await getTranslations({ locale, namespace: "Seo" });
  const regionName = await translatedRegionLabel(options.region, locale);
  return buildPageMetadata({
    title: t("feedRegionSuffix", {
      title: options.title,
      region: regionName,
    }),
    description: t("feedRegionDescription", {
      description: options.description,
      region: regionName,
    }),
    canonicalPath: options.canonicalPath,
    locale,
  });
}

export async function albionEntityTitle(
  name: string,
  kind: SeoEntityKind,
  region: string,
  locale?: string
): Promise<string> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Seo" });
  return t("entityTitle", {
    name,
    region: await translatedRegionLabel(region, loc),
    kind: t(`kinds.${kind}`),
  });
}

export async function playerSeoDescription(
  input: {
    name: string;
    region: string;
    killFame: number | null | undefined;
    deathFame: number | null | undefined;
    fameRatio?: string | null;
    guildName?: string | null;
    allianceName?: string | null;
  },
  locale?: string
): Promise<string> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Seo" });
  const affiliation = joinParts([
    input.guildName ? t("playerInGuild", { guild: input.guildName }) : null,
    input.allianceName
      ? t("playerAlliance", { alliance: input.allianceName })
      : null,
  ]);
  const stats = t("playerStats", {
    killFame: formatFame(input.killFame),
    deathFame: formatFame(input.deathFame),
    ratio: input.fameRatio
      ? t("playerRatio", { ratio: input.fameRatio })
      : "",
  });

  return t("playerDescription", {
    name: input.name,
    region: await translatedRegionLabel(input.region, loc),
    affiliation,
    stats,
    siteName: SITE_NAME,
  });
}

export async function guildSeoDescription(
  input: {
    name: string;
    region: string;
    killFame: number | null | undefined;
    deathFame: number | null | undefined;
    memberCount?: number | null;
    allianceName?: string | null;
    allianceTag?: string | null;
    founderName?: string | null;
    founded?: string | null;
  },
  locale?: string
): Promise<string> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Seo" });
  const alliance = input.allianceName
    ? input.allianceTag
      ? `[${input.allianceTag}] ${input.allianceName}`
      : input.allianceName
    : null;

  const stats = joinParts([
    input.memberCount != null
      ? t("memberCount", { count: input.memberCount })
      : null,
    t("killFameStat", { fame: formatFame(input.killFame) }),
    t("deathFameStat", { fame: formatFame(input.deathFame) }),
  ]);

  const founding = joinParts([
    input.founderName ? t("foundedBy", { name: input.founderName }) : null,
    input.founded ? `(${input.founded})` : null,
  ]);

  return t("guildDescription", {
    name: input.name,
    region: await translatedRegionLabel(input.region, loc),
    alliancePart: alliance ? t("guildAlliancePart", { alliance }) : "",
    stats,
    founding: founding ? `${founding}.` : "",
    siteName: SITE_NAME,
  });
}

export async function allianceSeoDescription(
  input: {
    name: string;
    region: string;
    memberCount?: number | null;
    guildCount: number;
    killFame?: number | null;
    deathFame?: number | null;
    founderName?: string | null;
    founded?: string | null;
  },
  locale?: string
): Promise<string> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Seo" });

  const stats = joinParts([
    input.memberCount != null
      ? t("memberCount", { count: input.memberCount })
      : null,
    t("guildCount", { count: input.guildCount }),
    input.killFame != null
      ? t("killFameStat", { fame: formatFame(input.killFame) })
      : null,
    input.deathFame != null
      ? t("deathFameStat", { fame: formatFame(input.deathFame) })
      : null,
  ]);

  const founding = joinParts([
    input.founderName ? t("foundedBy", { name: input.founderName }) : null,
    input.founded ? `(${input.founded})` : null,
  ]);

  return t("allianceDescription", {
    name: input.name,
    region: await translatedRegionLabel(input.region, loc),
    stats,
    founding: founding ? `${founding}.` : "",
    siteName: SITE_NAME,
  });
}

export async function killSeoTitle(
  killerName: string,
  victimName: string,
  region: string,
  killFame?: number | null,
  locale?: string
): Promise<string> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Seo" });
  const famePart =
    killFame != null
      ? t("killFamePart", { fame: formatFame(killFame) })
      : "";
  return albionEntityTitle(
    t("killTitle", { killer: killerName, victim: victimName, famePart }),
    "kill",
    region,
    loc
  );
}

export async function killSeoDescription(
  input: {
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
  },
  locale?: string
): Promise<string> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Seo" });
  const tCommon = await getTranslations({ locale: loc, namespace: "Common" });
  const killer = input.killerGuild
    ? `${input.killerName} (${input.killerGuild})`
    : input.killerName;
  const victim = input.victimGuild
    ? `${input.victimName} (${input.victimGuild})`
    : input.victimName;
  const contentKey = input.contentType
    ? `contentTypes.${input.contentType}`
    : null;
  const content =
    contentKey &&
    input.contentType &&
    input.contentType !== "GROUP" &&
    tCommon.has(contentKey)
      ? `${tCommon(contentKey)} `
      : "";

  const details = joinParts([
    t("killFameStat", { fame: formatFame(input.killFame) }),
    input.participantCount != null && input.participantCount > 0
      ? t("participantsCount", { count: input.participantCount })
      : null,
    input.lootCount != null && input.lootCount > 0
      ? t("lootCount", { count: input.lootCount })
      : null,
    input.battleId != null ? t("battleIdStat", { id: input.battleId }) : null,
  ]);

  return t("killDescription", {
    killer,
    victim,
    region: await translatedRegionLabel(input.region, loc),
    content,
    details,
    siteName: SITE_NAME,
  });
}

export async function battleSeoTitle(
  battleId: number | string,
  region: string,
  locale?: string
): Promise<string> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Seo" });
  return albionEntityTitle(
    t("battleTitle", { id: battleId }),
    "battle",
    region,
    loc
  );
}

export async function battleSeoDescription(
  input: {
    region: string;
    battleId: number | string;
    totalFame: number | null | undefined;
    totalKills?: number | null;
    totalPlayers?: number | null;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
  },
  locale?: string
): Promise<string> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Seo" });
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
    t("totalFameStat", { fame: formatFame(input.totalFame) }),
    input.totalKills != null
      ? t("killsCount", { count: input.totalKills })
      : null,
    input.totalPlayers != null
      ? t("playersCount", { count: input.totalPlayers })
      : null,
    durationMinutes != null
      ? t("durationMinutes", { count: durationMinutes })
      : null,
  ]);

  return t("battleDescription", {
    id: input.battleId,
    region: await translatedRegionLabel(input.region, loc),
    stats,
    siteName: SITE_NAME,
  });
}

export async function feudPageMetadata(input: {
  kind: "guild" | "alliance";
  nameA: string;
  nameB: string;
  region: string;
  canonicalPath: string;
  locale?: string;
}): Promise<Metadata> {
  const locale = await resolveLocale(input.locale);
  const t = await getTranslations({ locale, namespace: "Seo" });
  const region = await translatedRegionLabel(input.region, locale);
  const titleKey =
    input.kind === "guild" ? "feudTitle" : "allianceFeudTitle";
  const descriptionKey =
    input.kind === "guild" ? "feudDescription" : "allianceFeudDescription";

  return buildPageMetadata({
    title: t(titleKey, { nameA: input.nameA, nameB: input.nameB }),
    description: t(descriptionKey, {
      nameA: input.nameA,
      nameB: input.nameB,
      region,
    }),
    canonicalPath: input.canonicalPath,
    locale,
  });
}

export async function pendingEntityMetadata(
  kind: SeoEntityKind,
  canonicalPath: string,
  locale?: string
): Promise<Metadata> {
  const loc = await resolveLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "Seo" });
  const entity = t(`kinds.${kind}`);
  return buildPageMetadata({
    title: t("pendingTitle", { entity }),
    description: t("pendingDescription", { entity: entity.toLowerCase() }),
    canonicalPath,
    robots: NOINDEX_NOFOLLOW,
    locale: loc,
  });
}
