import { cache } from "react";
import { and, desc, eq, gt, gte, inArray, or, sql } from "drizzle-orm";
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
import { uiLookbackCutoff } from "@/lib/db/retention";
import {
  type ContentTypeFilter,
  type RegionFilters,
  killFamePositiveCondition,
  leaderboardConditions,
  regionCondition,
} from "./shared";

export interface KillFeedWatchResolved {
  playerIds?: string[];
  guildNamesLower?: string[];
  alliances?: { region: AlbionRegion; albionId: string }[];
}

export interface KillFeedFilters {
  region?: AlbionRegion | "all";
  contentType?: ContentTypeFilter;
  limit?: number;
  offset?: number;
  /** Return only kills newer than this timestamp (ISO or Date). */
  after?: Date | string;
  /** Optional tie-break when multiple kills share `after` timestamp. */
  afterEventId?: number;
  /** Minimum victim kill fame (inclusive). */
  minFame?: number;
  /** Pre-resolved watchlist matchers. Skips the shared cache. */
  watch?: KillFeedWatchResolved;
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
  if (!event.rawPayload || event.detailEvictedAt) {
    return {
      eventId: event.eventId,
      region: event.region,
      occurredAt: event.occurredAt,
      contentType: event.contentType,
      totalVictimKillFame: event.totalVictimKillFame,
      killer: event.killer
        ? {
            albionId: event.killer.albionId,
            name: event.killer.name,
            guild: event.killer.guild
              ? {
                  name: event.killer.guild.name,
                  albionId: event.killer.guild.albionId,
                }
              : null,
            allianceTag: null,
          }
        : null,
      victim: event.victim
        ? {
            albionId: event.victim.albionId,
            name: event.victim.name,
            guild: event.victim.guild
              ? {
                  name: event.victim.guild.name,
                  albionId: event.victim.guild.albionId,
                }
              : null,
            allianceTag: null,
          }
        : null,
      items: undefined,
      participants: undefined,
    };
  }

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

function watchlistCondition(watch: KillFeedWatchResolved) {
  const parts = [];
  if (watch.playerIds && watch.playerIds.length > 0) {
    parts.push(
      or(
        inArray(schema.killEvents.killerId, watch.playerIds),
        inArray(schema.killEvents.victimId, watch.playerIds)
      )
    );
  }
  if (watch.guildNamesLower && watch.guildNamesLower.length > 0) {
    parts.push(
      sql`exists (
        select 1 from kill_participants kp
        where kp.event_id = ${schema.killEvents.id}
          and kp.role in ('killer', 'victim')
          and lower(trim(kp.guild_name)) in (${sql.join(
            watch.guildNamesLower.map((name) => sql`${name}`),
            sql`, `
          )})
      )`
    );
  }
  if (watch.alliances && watch.alliances.length > 0) {
    const allianceParts = watch.alliances.map((alliance) =>
      and(
        eq(schema.killEvents.region, alliance.region),
        or(
          sql`${schema.killEvents.rawPayload}->'Killer'->>'AllianceId' = ${alliance.albionId}`,
          sql`${schema.killEvents.rawPayload}->'Victim'->>'AllianceId' = ${alliance.albionId}`
        )
      )
    );
    const allianceOr = or(...allianceParts);
    if (allianceOr) parts.push(allianceOr);
  }
  if (parts.length === 0) return sql`false`;
  return or(...parts);
}

async function loadKillFeed(filters: {
  region: AlbionRegion | "all";
  contentType: ContentTypeFilter;
  limit: number;
  offset: number;
  after?: string;
  afterEventId?: number;
  minFame?: number;
  watch?: KillFeedWatchResolved;
}) {
  const {
    region,
    contentType,
    limit,
    offset,
    after,
    afterEventId,
    minFame,
    watch,
  } = filters;

  const conditions = [killFamePositiveCondition()];
  conditions.push(gte(schema.killEvents.occurredAt, uiLookbackCutoff()));
  const regionFilter = regionCondition(region);
  if (regionFilter) conditions.push(regionFilter);
  if (contentType !== "all") {
    conditions.push(eq(schema.killEvents.contentType, contentType));
  }
  if (minFame != null && minFame > 0) {
    conditions.push(gte(schema.killEvents.totalVictimKillFame, minFame));
  }
  if (watch) {
    const watchCond = watchlistCondition(watch);
    if (watchCond) conditions.push(watchCond);
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
    offset: number,
    minFame: number
  ) => loadKillFeed({ region, contentType, limit, offset, minFame }),
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
    minFame = 0,
    watch,
  } = filters;

  if (after || watch) {
    const afterIso = after
      ? after instanceof Date
        ? after.toISOString()
        : after
      : undefined;
    return loadKillFeed({
      region,
      contentType,
      limit,
      offset: after ? 0 : offset,
      after: afterIso,
      afterEventId,
      minFame,
      watch,
    });
  }

  return cachedKillFeed(region, contentType, limit, offset, minFame);
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
