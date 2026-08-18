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
  coveringRegionCondition,
  killFamePositiveCondition,
  leaderboardConditions,
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

type KillCardGuild = {
  albionId: string;
  name: string;
  allianceTag?: string | null;
} | null;

type KillCardItemSource = {
  ownerRole: string;
  slot: string | null;
  itemType: string;
  quality: number | null;
  category: string;
};

type KillEventCardSource = {
  eventId: number;
  region: AlbionRegion;
  occurredAt: Date;
  contentType: string;
  totalVictimKillFame: number | null;
  detailEvictedAt?: Date | null;
  killerGuildAlbionId?: string | null;
  killerGuildName?: string | null;
  rawPayload?: unknown | null;
  killer?: {
    albionId: string;
    name: string;
    guild?: KillCardGuild;
  } | null;
  victim?: {
    albionId: string;
    name: string;
    guild?: KillCardGuild;
  } | null;
  items?: KillCardItemSource[];
  participants?: {
    role: string;
    averageItemPower: string | null;
  }[];
};

function withItemDisplayNames(items: KillCardItemSource[]) {
  return items.map((item) => ({
    ...item,
    displayNames: Object.fromEntries(
      LOCALE_CODES.map((locale) => [
        locale,
        getCatalogItemName(item.itemType, locale) ??
          formatItemName(item.itemType),
      ])
    ),
  }));
}

function currentGuildRef(guild: KillCardGuild) {
  return guild
    ? { name: guild.name, albionId: guild.albionId }
    : null;
}

export function mapKillEventToCard(event: KillEventCardSource) {
  if (event.rawPayload && !event.detailEvictedAt) {
    const payload = event.rawPayload as AlbionEvent;
    const extras = albionEventToKillCard(event.region, payload);
    const killerGuild =
      extras.killer?.guild ?? currentGuildRef(event.killer?.guild ?? null);
    const victimGuild =
      extras.victim?.guild ?? currentGuildRef(event.victim?.guild ?? null);

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
      items: extras.items ? withItemDisplayNames(extras.items) : undefined,
      participants: extras.participants,
    };
  }

  const killerGuild = event.killerGuildName
    ? {
        name: event.killerGuildName,
        albionId: event.killerGuildAlbionId ?? undefined,
      }
    : currentGuildRef(event.killer?.guild ?? null);

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
          guild: killerGuild,
          allianceTag: event.killer.guild?.allianceTag ?? null,
        }
      : null,
    victim: event.victim
      ? {
          albionId: event.victim.albionId,
          name: event.victim.name,
          guild: currentGuildRef(event.victim.guild ?? null),
          allianceTag: event.victim.guild?.allianceTag ?? null,
        }
      : null,
    items: event.items ? withItemDisplayNames(event.items) : undefined,
    participants: event.participants,
  };
}

const KILL_CARD_SIDES = ["killer", "victim"] as const;

/** Load list-card fields for already-ranked kill IDs. Never selects JSONB. */
export async function hydrateKillCardsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const events = await db.query.killEvents.findMany({
    where: inArray(schema.killEvents.id, ids),
    columns: {
      id: true,
      eventId: true,
      region: true,
      occurredAt: true,
      contentType: true,
      totalVictimKillFame: true,
      detailEvictedAt: true,
      killerGuildAlbionId: true,
      killerGuildName: true,
    },
    with: {
      killer: {
        columns: { albionId: true, name: true },
        with: {
          guild: {
            columns: { albionId: true, name: true, allianceTag: true },
          },
        },
      },
      victim: {
        columns: { albionId: true, name: true },
        with: {
          guild: {
            columns: { albionId: true, name: true, allianceTag: true },
          },
        },
      },
      items: {
        columns: {
          ownerRole: true,
          slot: true,
          itemType: true,
          quality: true,
          category: true,
        },
        where: inArray(schema.killItems.ownerRole, KILL_CARD_SIDES),
      },
      participants: {
        columns: {
          role: true,
          averageItemPower: true,
        },
        where: inArray(schema.killParticipants.role, KILL_CARD_SIDES),
      },
    },
  });

  const byId = new Map(events.map((event) => [event.id, event]));
  return ids
    .map((id) => byId.get(id))
    .filter((event): event is NonNullable<typeof event> => event != null)
    .map(mapKillEventToCard);
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
          eq(
            schema.killEvents.killerAllianceAlbionId,
            alliance.albionId
          ),
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
  const regionFilter = coveringRegionCondition(region);
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

  const idRows = await db
    .select({ id: schema.killEvents.id })
    .from(schema.killEvents)
    .where(where)
    .orderBy(
      desc(schema.killEvents.occurredAt),
      desc(schema.killEvents.eventId)
    )
    .limit(limit)
    .offset(after ? 0 : offset);

  return hydrateKillCardsByIds(idRows.map((row) => row.id));
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

  const idRows = await db
    .select({ id: schema.killEvents.id })
    .from(schema.killEvents)
    .where(and(...conditions))
    .orderBy(desc(schema.killEvents.totalVictimKillFame))
    .limit(limit);

  return hydrateKillCardsByIds(idRows.map((row) => row.id));
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
      killer: {
        columns: { albionId: true, name: true },
        with: {
          guild: {
            columns: { albionId: true, name: true, allianceTag: true },
          },
        },
      },
      victim: {
        columns: { albionId: true, name: true },
        with: {
          guild: {
            columns: { albionId: true, name: true, allianceTag: true },
          },
        },
      },
      battle: {
        columns: { totalPlayers: true },
      },
      participants: {
        columns: {
          id: true,
          playerId: true,
          role: true,
          name: true,
          guildName: true,
          averageItemPower: true,
          supportHealingDone: true,
        },
        with: {
          player: {
            columns: { albionId: true, name: true },
            with: {
              guild: { columns: { albionId: true, name: true } },
            },
          },
        },
      },
      items: {
        columns: {
          ownerRole: true,
          category: true,
          slot: true,
          itemType: true,
          quality: true,
          count: true,
        },
      },
    },
  });
}
