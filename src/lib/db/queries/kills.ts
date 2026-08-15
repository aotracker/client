import { cache } from "react";
import { and, desc, eq, gt, or } from "drizzle-orm";
import { LOCALE_CODES } from "@/i18n/locales";
import { albionEventToKillCard } from "@/lib/albion/player-history";
import {
  HOME_CACHE_REVALIDATE_SECONDS,
  LEADERBOARD_CACHE_REVALIDATE_SECONDS,
  cachedQuery,
} from "@/lib/cache";
import { getCatalogItemName } from "@/lib/items/catalog";
import { formatItemName } from "@/lib/utils";
import type { AlbionEvent, AlbionRegion } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";
import {
  type ContentTypeFilter,
  type RegionFilters,
  killFamePositiveCondition,
  leaderboardConditions,
  regionCondition,
} from "./shared";

export interface KillFeedFilters {
  region?: AlbionRegion | "all";
  contentType?: ContentTypeFilter;
  limit?: number;
  offset?: number;
  /** Return only kills newer than this timestamp (ISO or Date). */
  after?: Date | string;
  /** Optional tie-break when multiple kills share `after` timestamp. */
  afterEventId?: number;
}

export interface JuicyKillsFilters extends RegionFilters {
  /** Lookback window in days. Defaults to 7. */
  days?: number;
  contentType?: ContentTypeFilter;
}

type KillEventWithRelations = Awaited<
  ReturnType<
    typeof db.query.killEvents.findMany<{
      with: {
        killer: { with: { guild: true } };
        victim: { with: { guild: true } };
      };
    }>
  >
>[number];

export function mapKillEventToCard(event: KillEventWithRelations) {
  const payload = event.rawPayload as AlbionEvent;
  const extras = albionEventToKillCard(event.region, payload);
  const killerGuild =
    extras.killer?.guild ??
    (event.killer?.guild
      ? {
          name: event.killer.guild.name,
          albionId: event.killer.guild.albionId,
        }
      : null);
  const victimGuild =
    extras.victim?.guild ??
    (event.victim?.guild
      ? {
          name: event.victim.guild.name,
          albionId: event.victim.guild.albionId,
        }
      : null);

  return {
    eventId: event.eventId,
    region: event.region,
    occurredAt: event.occurredAt,
    contentType: event.contentType,
    totalVictimKillFame: event.totalVictimKillFame,
    killer:
      event.killer || extras.killer
        ? {
            albionId: event.killer?.albionId ?? extras.killer!.albionId,
            name: event.killer?.name ?? extras.killer?.name ?? "Unknown",
            guild: killerGuild,
            allianceTag: extras.killer?.allianceTag ?? null,
          }
        : null,
    victim:
      event.victim || extras.victim
        ? {
            albionId: event.victim?.albionId ?? extras.victim!.albionId,
            name: event.victim?.name ?? extras.victim?.name ?? "Unknown",
            guild: victimGuild,
            allianceTag: extras.victim?.allianceTag ?? null,
          }
        : null,
    items: extras.items?.map((item) => ({
      ...item,
      displayNames: Object.fromEntries(
        LOCALE_CODES.map((locale) => [
          locale,
          getCatalogItemName(item.itemType, locale) ??
            formatItemName(item.itemType),
        ])
      ),
    })),
    participants: extras.participants,
  };
}

async function loadKillFeed(filters: {
  region: AlbionRegion | "all";
  contentType: ContentTypeFilter;
  limit: number;
  offset: number;
  after?: string;
  afterEventId?: number;
}) {
  const { region, contentType, limit, offset, after, afterEventId } = filters;

  const conditions = [killFamePositiveCondition()];
  const regionFilter = regionCondition(region);
  if (regionFilter) conditions.push(regionFilter);
  if (contentType !== "all") {
    conditions.push(eq(schema.killEvents.contentType, contentType));
  }
  if (after) {
    const afterDate = new Date(after);
    if (!Number.isNaN(afterDate.getTime())) {
      if (afterEventId != null && Number.isFinite(afterEventId)) {
        const afterCond = or(
          gt(schema.killEvents.occurredAt, afterDate),
          and(
            eq(schema.killEvents.occurredAt, afterDate),
            gt(schema.killEvents.eventId, afterEventId)
          )
        );
        if (afterCond) conditions.push(afterCond);
      } else {
        conditions.push(gt(schema.killEvents.occurredAt, afterDate));
      }
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const events = await db.query.killEvents.findMany({
    where,
    orderBy: [desc(schema.killEvents.occurredAt)],
    limit,
    offset: after ? 0 : offset,
    with: {
      killer: { with: { guild: true } },
      victim: { with: { guild: true } },
    },
  });

  return events.map(mapKillEventToCard);
}

const cachedKillFeed = cachedQuery(
  async (
    region: AlbionRegion | "all",
    contentType: ContentTypeFilter,
    limit: number,
    offset: number
  ) => loadKillFeed({ region, contentType, limit, offset }),
  ["kill-feed"],
  HOME_CACHE_REVALIDATE_SECONDS,
  ["kills"]
);

export const getKillFeed = cache(async function getKillFeed(
  filters: KillFeedFilters = {}
) {
  const {
    region = "all",
    contentType = "all",
    limit = 50,
    offset = 0,
    after,
    afterEventId,
  } = filters;

  if (after) {
    const afterIso = after instanceof Date ? after.toISOString() : after;
    return loadKillFeed({
      region,
      contentType,
      limit,
      offset: 0,
      after: afterIso,
      afterEventId,
    });
  }

  return cachedKillFeed(region, contentType, limit, offset);
});

async function loadRecentJuicyKills(
  region: AlbionRegion | "all",
  limit: number,
  days: number,
  contentType: ContentTypeFilter
) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = leaderboardConditions(
    { region, days, contentType, limit },
    cutoff
  );

  const events = await db.query.killEvents.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.killEvents.totalVictimKillFame)],
    limit,
    with: {
      killer: { with: { guild: true } },
      victim: { with: { guild: true } },
    },
  });

  return events.map(mapKillEventToCard);
}

const cachedRecentJuicyKills = cachedQuery(
  loadRecentJuicyKills,
  ["juicy-kills"],
  LEADERBOARD_CACHE_REVALIDATE_SECONDS,
  ["kills", "leaderboards"]
);

export const getRecentJuicyKills = cache(async function getRecentJuicyKills(
  filters: JuicyKillsFilters = {}
) {
  const { region = "all", limit = 5, days = 7, contentType = "all" } = filters;
  return cachedRecentJuicyKills(region, limit, days, contentType);
});

export async function getKillEvent(region: AlbionRegion, eventId: number) {
  return db.query.killEvents.findFirst({
    where: and(
      eq(schema.killEvents.region, region),
      eq(schema.killEvents.eventId, eventId)
    ),
    with: {
      killer: { with: { guild: true } },
      victim: { with: { guild: true } },
      battle: true,
      participants: {
        with: { player: { with: { guild: true } }, items: true },
      },
      items: true,
    },
  });
}
