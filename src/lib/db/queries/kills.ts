import { cache } from "react";
import { and, desc, eq, gt, gte, inArray, or, sql } from "drizzle-orm";
import { LOCALE_CODES } from "@/i18n/locales";
import {
  mapKillEventToCard as mapKillEventFields,
  type KillCardItemSource,
} from "@/lib/albion/kill-card-map";
import {
  HOME_CACHE_REVALIDATE_SECONDS,
  LEADERBOARD_CACHE_REVALIDATE_SECONDS,
  cachedQuery,
} from "@/lib/cache";
import { getCatalogItemName } from "@/lib/items/catalog";
import { formatItemName } from "@/lib/utils";
import type { AlbionRegion } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";
import { uiLookbackCutoff } from "@/lib/db/retention";
import {
  estimateGroupedItemValues,
  mergeLiveVictimSilver,
  type GearValueItem,
} from "@/lib/market/estimate-gear-value";
import {
  type ContentTypeFilter,
  type RegionFilters,
  coveringRegionCondition,
  juicyLootCondition,
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
  /** Victim inventory estimated silver ≥ 20m. */
  juicy?: boolean;
  /** Pre-resolved watchlist matchers. Skips the shared cache. */
  watch?: KillFeedWatchResolved;
}

export interface JuicyKillsFilters extends RegionFilters {
  /** Lookback window in days. Defaults to 7. */
  days?: number;
  contentType?: ContentTypeFilter;
}

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

export function mapKillEventToCard(
  event: Parameters<typeof mapKillEventFields>[0]
) {
  const card = mapKillEventFields(event);
  return {
    ...card,
    items: card.items ? withItemDisplayNames(card.items) : undefined,
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
      participantCount: true,
      lootEstSilver: true,
      gearEstSilver: true,
      detailEvictedAt: true,
      killerGuildAlbionId: true,
      killerGuildName: true,
      victimGuildAlbionId: true,
      victimGuildName: true,
    },
    with: {
      killer: {
        columns: { albionId: true, name: true },
      },
      victim: {
        columns: { albionId: true, name: true },
      },
      items: {
        columns: {
          ownerRole: true,
          slot: true,
          itemType: true,
          quality: true,
          category: true,
          count: true,
        },
        where: inArray(schema.killItems.ownerRole, KILL_CARD_SIDES),
      },
      participants: {
        columns: {
          role: true,
          guildName: true,
          averageItemPower: true,
        },
        where: inArray(schema.killParticipants.role, KILL_CARD_SIDES),
      },
    },
  });

  const byId = new Map(events.map((event) => [event.id, event]));
  const cards = ids
    .map((id) => byId.get(id))
    .filter((event): event is NonNullable<typeof event> => event != null)
    .map(mapKillEventToCard);
  return withLiveVictimSilver(cards);
}

function victimValueItems(
  items: KillCardItemSource[] | undefined,
  category: "equipment" | "inventory"
): GearValueItem[] {
  return (
    items
      ?.filter(
        (item) => item.ownerRole === "victim" && item.category === category
      )
      .map((item) => ({
        itemType: item.itemType,
        quality: item.quality,
        count: item.count ?? 1,
      })) ?? []
  );
}

async function withLiveVictimSilver<
  T extends {
    region: string;
    items?: KillCardItemSource[];
    gearEstSilver?: number | null;
    lootEstSilver?: number | null;
  },
>(cards: T[]): Promise<T[]> {
  if (cards.length === 0) return cards;

  const byRegion = new Map<AlbionRegion, number[]>();
  cards.forEach((card, index) => {
    const region = card.region as AlbionRegion;
    const list = byRegion.get(region) ?? [];
    list.push(index);
    byRegion.set(region, list);
  });

  const next = cards.slice();
  for (const [region, indexes] of byRegion) {
    const groups = indexes.flatMap((index) => [
      victimValueItems(next[index].items, "equipment"),
      victimValueItems(next[index].items, "inventory"),
    ]);
    const estimates = await estimateGroupedItemValues(region, groups).catch(
      () => null
    );
    if (!estimates) continue;

    indexes.forEach((cardIndex, groupIndex) => {
      const card = next[cardIndex];
      const gear = estimates[groupIndex * 2];
      const loot = estimates[groupIndex * 2 + 1];
      const merged = mergeLiveVictimSilver({
        hasVictimItems: (card.items ?? []).some(
          (item) => item.ownerRole === "victim"
        ),
        storedGear: card.gearEstSilver,
        storedLoot: card.lootEstSilver,
        liveGear: gear?.totalSilver ?? 0,
        liveLoot: loot?.totalSilver ?? 0,
      });
      next[cardIndex] = { ...card, ...merged };
    });
  }

  return next;
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
  juicy?: boolean;
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
    juicy,
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
  if (juicy) {
    conditions.push(juicyLootCondition());
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
    minFame: number,
    juicy: boolean
  ) => loadKillFeed({ region, contentType, limit, offset, minFame, juicy }),
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
    juicy = false,
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
      juicy,
      watch,
    });
  }

  return cachedKillFeed(region, contentType, limit, offset, minFame, juicy);
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
