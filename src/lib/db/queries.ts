import { cache } from "react";
import { and, count, desc, eq, gt, gte, ilike, inArray, isNotNull, lte, ne, or, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { albionEventToKillCard } from "@/lib/albion/player-history";
import { normalizeAllianceInfo, parseAllianceGuilds } from "@/lib/albion/alliance-info";
import type {
  AlbionBattle,
  AlbionBattleAllianceStats,
  AlbionBattleGuildStats,
  AlbionEvent,
  AlbionRegion,
  AlbionAllianceInfo,
  AlbionPlayerRef,
  ContentType,
  GuildBattleSummary,
  NormalizedAllianceInfo,
} from "@/lib/albion/types";
import { ENABLED_REGIONS, TOP_BUILD_SLOTS } from "@/lib/albion/types";
import { wrapGuildBattleListCache, isGuildBattleCacheComplete } from "@/lib/albion/battles";
import {
  canonicalizeItemType,
  itemFamilyKey,
  ITEM_QUALITY_EXCELLENT,
  parseItemType,
} from "@/lib/item-icons";
import { db, schema } from "@/lib/db";
import { BATTLES_FEED_PREVIEW_LIMIT, RELATED_BATTLE_WINDOW_MS } from "@/lib/battles-constants";
import { scoreRelatedBattles } from "@/lib/battles/related";

/**
 * SQL filter matching `hasKillFame`: positive victim kill fame only.
 * Null/0 fame kills (empty drops / Depths-style) stay out of public lists.
 */
function killFamePositiveCondition() {
  return gt(schema.killEvents.totalVictimKillFame, 0);
}

export type ContentTypeFilter = "ZVZ" | "SOLO" | "GROUP" | "all";

export interface PlayerActivityDay {
  day: string;
  /** Distinct PvP kill events the player appeared in (any role). */
  events: number;
  kills: number;
  deaths: number;
}

export interface PlayerFameDay {
  day: string;
  earned: number;
  lost: number;
}

export interface PlayerContentMixEntry {
  contentType: ContentType;
  count: number;
}

export interface PlayerBuildItem {
  slot: string;
  itemType: string;
  quality: number;
}

export interface PlayerTopBuild {
  count: number;
  items: PlayerBuildItem[];
}

export interface PlayerAnalytics {
  activity: PlayerActivityDay[];
  fameByDay: PlayerFameDay[];
  contentMix: PlayerContentMixEntry[];
  topBuilds: PlayerTopBuild[];
}

const EMPTY_PLAYER_ANALYTICS: PlayerAnalytics = {
  activity: [],
  fameByDay: [],
  contentMix: [],
  topBuilds: [],
};

function getLast30DaysCutoff() {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

function toDateKey(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

function extractBuildItemsFromParticipantPayload(
  raw: unknown
): PlayerBuildItem[] {
  const equipment = (raw as AlbionPlayerRef | null | undefined)?.Equipment;
  if (!equipment) return [];

  const items: PlayerBuildItem[] = [];
  for (const slot of TOP_BUILD_SLOTS) {
    const item = equipment[slot];
    if (item?.Type) {
      items.push({
        slot,
        itemType: item.Type,
        quality: item.Quality ?? 0,
      });
    }
  }
  return items;
}

function getMainHandItem(
  items: PlayerBuildItem[]
): PlayerBuildItem | undefined {
  return items.find((item) => item.slot === "MainHand");
}

/** Assist/group payloads often only include MainHand. */
function isSparseBuild(items: PlayerBuildItem[]): boolean {
  return items.length > 0 && items.length < 3;
}

/** Fingerprint by gear family (same item across tiers/enchantments/quality). */
function buildFingerprint(items: PlayerBuildItem[]): string {
  const bySlot = new Map(items.map((item) => [item.slot, item]));
  return TOP_BUILD_SLOTS.filter((slot) => bySlot.has(slot))
    .map((slot) => `${slot}:${itemFamilyKey(bySlot.get(slot)!.itemType)}`)
    .join("|");
}

/** Display builds as T8 Excellent of each item family. */
function canonicalizeBuildItems(items: PlayerBuildItem[]): PlayerBuildItem[] {
  return items.map((item) => ({
    slot: item.slot,
    itemType: canonicalizeItemType(item.itemType),
    quality: ITEM_QUALITY_EXCELLENT,
  }));
}

function itemPowerScore(itemType: string): number {
  const { tier, enchantment } = parseItemType(itemType);
  return tier * 10 + enchantment;
}

function buildPowerScore(items: PlayerBuildItem[]): number {
  return items.reduce((sum, item) => sum + itemPowerScore(item.itemType), 0);
}

function preferBuildItems(
  current: PlayerBuildItem[],
  candidate: PlayerBuildItem[]
): PlayerBuildItem[] {
  if (candidate.length > current.length) return candidate;
  if (candidate.length < current.length) return current;
  return buildPowerScore(candidate) > buildPowerScore(current)
    ? candidate
    : current;
}

/**
 * Merge weapon-only (sparse) participations into full loadouts that share the
 * same MainHand family, so assist events still count toward complete builds.
 * Same gear at different tiers/enchantments is combined (e.g. 6.3 + 7.2 Hunter Shoes).
 */
function aggregateTopBuilds(
  samples: PlayerBuildItem[][],
  limit = 9
): PlayerTopBuild[] {
  const fullByWeapon = new Map<string, PlayerBuildItem[]>();

  for (const items of samples) {
    if (isSparseBuild(items)) continue;
    const mainHand = getMainHandItem(items);
    if (!mainHand) continue;
    const weaponKey = itemFamilyKey(mainHand.itemType);
    const existing = fullByWeapon.get(weaponKey);
    if (!existing) {
      fullByWeapon.set(weaponKey, items);
    } else {
      fullByWeapon.set(weaponKey, preferBuildItems(existing, items));
    }
  }

  const buildCounts = new Map<
    string,
    { count: number; items: PlayerBuildItem[] }
  >();

  for (const items of samples) {
    let resolved = items;
    if (isSparseBuild(items)) {
      const mainHand = getMainHandItem(items);
      const full = mainHand
        ? fullByWeapon.get(itemFamilyKey(mainHand.itemType))
        : undefined;
      if (full) {
        resolved = full;
      }
    }

    const key = buildFingerprint(resolved);
    if (!key) continue;
    const existing = buildCounts.get(key);
    if (existing) {
      existing.count += 1;
      existing.items = preferBuildItems(existing.items, resolved);
    } else {
      buildCounts.set(key, { count: 1, items: resolved });
    }
  }

  return [...buildCounts.values()]
    .sort((a, b) => b.count - a.count || b.items.length - a.items.length)
    .slice(0, limit)
    .map((build) => ({
      ...build,
      items: canonicalizeBuildItems(build.items),
    }));
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
}

export interface RegionFilters {
  region?: AlbionRegion | "all";
  limit?: number;
}

export interface JuicyKillsFilters extends RegionFilters {
  /** Lookback window in days. Defaults to 7. */
  days?: number;
  contentType?: ContentTypeFilter;
}

export interface TopKillerFilters extends RegionFilters {
  /** Lookback window in days. Defaults to 7. */
  days?: number;
  contentType?: ContentTypeFilter;
}

export interface LeaderboardFilters extends TopKillerFilters {
  limit?: number;
}

export interface TopGuildEntry {
  rank: number;
  killFame: number;
  killCount: number;
  guild: {
    albionId: string;
    name: string;
    region: AlbionRegion;
  };
}

export interface TopFameEntry {
  rank: number;
  killFame: number;
  killCount: number;
  player: TopKillerEntry["player"];
}

export interface GuildOpponentEntry {
  guildName: string;
  guildAlbionId: string | null;
  killsAgainst: number;
  fameAgainst: number;
  deathsTo: number;
  fameLost: number;
}

export interface GuildFeudStats {
  aKillsB: number;
  bKillsA: number;
  aFameOnB: number;
  bFameOnA: number;
}

export interface PlayerAssociationEntry {
  albionId: string;
  name: string;
  region: AlbionRegion;
  guild?: { name: string; albionId?: string } | null;
  encounters: number;
  fame: number;
}

export interface PlayerAssociations {
  allies: PlayerAssociationEntry[];
}

export interface BattlesFeedFilters {
  region?: AlbionRegion | "all";
  /** Case-insensitive name match against guilds, alliances, or players in battle payloads. */
  q?: string;
  limit?: number;
  offset?: number;
}

export interface BattlesFeedItem {
  id: number;
  region: AlbionRegion;
  startTime: string | null;
  totalFame: number | null;
  totalKills: number | null;
  totalPlayers: number | null;
  alliances: BattlesFeedParticipant[];
  guilds: BattlesFeedParticipant[];
  allianceCount: number;
  guildCount: number;
}

export interface BattlesFeedParticipant {
  id: string;
  name: string;
}

export interface TopKillerEntry {
  rank: number;
  killCount: number;
  player: {
    albionId: string;
    name: string;
    region: AlbionRegion;
    guild?: { name: string; albionId?: string } | null;
  };
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

function mapKillEventToCard(event: KillEventWithRelations) {
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
          }
        : null,
    victim:
      event.victim || extras.victim
        ? {
            albionId: event.victim?.albionId ?? extras.victim!.albionId,
            name: event.victim?.name ?? extras.victim?.name ?? "Unknown",
            guild: victimGuild,
          }
        : null,
    items: extras.items,
    participants: extras.participants,
  };
}

function regionCondition(region: AlbionRegion | "all") {
  if (region !== "all") {
    return eq(schema.killEvents.region, region);
  }
  if (ENABLED_REGIONS.length === 0) {
    return sql`false`;
  }
  return inArray(schema.killEvents.region, ENABLED_REGIONS);
}

function leaderboardConditions(
  filters: LeaderboardFilters,
  cutoff: Date
) {
  const { region = "all", contentType = "all" } = filters;
  const conditions = [
    killFamePositiveCondition(),
    gte(schema.killEvents.occurredAt, cutoff),
  ];
  const regionFilter = regionCondition(region);
  if (regionFilter) conditions.push(regionFilter);
  if (contentType !== "all") {
    conditions.push(eq(schema.killEvents.contentType, contentType));
  }
  return conditions;
}

function battlesRegionCondition(region: AlbionRegion | "all") {
  if (region !== "all") {
    return eq(schema.battles.region, region);
  }
  if (ENABLED_REGIONS.length === 0) {
    return sql`false`;
  }
  return inArray(schema.battles.region, ENABLED_REGIONS);
}

/** Exclude kill-ingest stubs that never received battle stats. */
function battlesFeedWhere(
  region: AlbionRegion | "all",
  q?: string
) {
  const conditions = [
    battlesRegionCondition(region),
    isNotNull(schema.battles.totalFame),
    isNotNull(schema.battles.totalKills),
    isNotNull(schema.battles.totalPlayers),
  ];

  const nameQuery = q?.trim() ?? "";
  if (nameQuery.length > 0) {
    const pattern = `%${nameQuery.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    conditions.push(
      sql`(
        EXISTS (
          SELECT 1
          FROM jsonb_each(COALESCE(${schema.battles.rawPayload}->'players', '{}'::jsonb)) AS p(key, value)
          WHERE p.value->>'name' ILIKE ${pattern} ESCAPE '\'
             OR p.value->>'guildName' ILIKE ${pattern} ESCAPE '\'
             OR p.value->>'allianceName' ILIKE ${pattern} ESCAPE '\'
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_each(COALESCE(${schema.battles.rawPayload}->'guilds', '{}'::jsonb)) AS g(key, value)
          WHERE g.value->>'name' ILIKE ${pattern} ESCAPE '\'
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_each(COALESCE(${schema.battles.rawPayload}->'alliances', '{}'::jsonb)) AS a(key, value)
          WHERE a.value->>'name' ILIKE ${pattern} ESCAPE '\'
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(${schema.battles.detailPayload}->'players', '[]'::jsonb)) AS p(value)
          WHERE p.value->>'name' ILIKE ${pattern} ESCAPE '\'
             OR p.value->>'guildName' ILIKE ${pattern} ESCAPE '\'
             OR p.value->>'allianceName' ILIKE ${pattern} ESCAPE '\'
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(${schema.battles.detailPayload}->'guilds', '[]'::jsonb)) AS g(value)
          WHERE g.value->>'name' ILIKE ${pattern} ESCAPE '\'
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(${schema.battles.detailPayload}->'alliances', '[]'::jsonb)) AS a(value)
          WHERE a.value->>'name' ILIKE ${pattern} ESCAPE '\'
        )
      )`
    );
  }

  return and(...conditions);
}

export const getKillFeed = cache(async function getKillFeed(filters: KillFeedFilters = {}) {
  const {
    region = "all",
    contentType = "all",
    limit = 50,
    offset = 0,
    after,
    afterEventId,
  } = filters;

  const conditions = [killFamePositiveCondition()];
  const regionFilter = regionCondition(region);
  if (regionFilter) conditions.push(regionFilter);
  if (contentType !== "all") {
    conditions.push(eq(schema.killEvents.contentType, contentType));
  }
  if (after) {
    const afterDate = after instanceof Date ? after : new Date(after);
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
});

export const getRecentJuicyKills = cache(async function getRecentJuicyKills(
  filters: JuicyKillsFilters = {}
) {
  const { region = "all", limit = 5, days = 7, contentType = "all" } = filters;
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
});

export const getTopKillers = cache(async function getTopKillers(
  filters: TopKillerFilters = {}
) {
  const {
    region = "all",
    limit = 10,
    days = 7,
    contentType = "all",
  } = filters;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [
    ...leaderboardConditions({ region, days, contentType, limit }, cutoff),
    isNotNull(schema.killEvents.killerId),
  ];

  const rows = await db
    .select({
      killerId: schema.killEvents.killerId,
      killCount: count(),
    })
    .from(schema.killEvents)
    .where(and(...conditions))
    .groupBy(schema.killEvents.killerId)
    .orderBy(desc(count()))
    .limit(limit);

  const killerIds = rows
    .map((r) => r.killerId)
    .filter((id): id is string => id != null);

  if (killerIds.length === 0) return [];

  const players = await db.query.players.findMany({
    where: inArray(schema.players.id, killerIds),
    with: { guild: true },
  });

  const playerById = new Map(players.map((p) => [p.id, p]));

  return rows.reduce<TopKillerEntry[]>((acc, row, index) => {
    if (!row.killerId) return acc;
    const player = playerById.get(row.killerId);
    if (!player) return acc;

    acc.push({
      rank: index + 1,
      killCount: row.killCount,
      player: {
        albionId: player.albionId,
        name: player.name,
        region: player.region,
        guild: player.guild
          ? { name: player.guild.name, albionId: player.guild.albionId }
          : null,
      },
    });
    return acc;
  }, []);
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

export async function getPlayerByAlbionId(
  region: AlbionRegion,
  albionId: string
) {
  return db.query.players.findFirst({
    where: and(
      eq(schema.players.region, region),
      eq(schema.players.albionId, albionId)
    ),
    with: { guild: true },
  });
}

export async function getPlayerProfile(
  region: AlbionRegion,
  albionId: string
) {
  const player = await getPlayerByAlbionId(region, albionId);
  if (!player) return null;

  return { player };
}

export async function getGuildByAlbionId(
  region: AlbionRegion,
  albionId: string
) {
  return db.query.guilds.findFirst({
    where: and(
      eq(schema.guilds.region, region),
      eq(schema.guilds.albionId, albionId)
    ),
  });
}

/** Persist guild top/recent battle summaries (partial updates allowed). */
export async function cacheGuildBattleLists(
  region: AlbionRegion,
  guildId: string,
  lists: {
    topBattles?: GuildBattleSummary[];
    recentBattles?: GuildBattleSummary[];
  }
): Promise<void> {
  const existing = await getGuildByAlbionId(region, guildId);
  if (!existing) return;

  const topDefined = lists.topBattles !== undefined;
  const recentDefined = lists.recentBattles !== undefined;
  if (!topDefined && !recentDefined) return;

  const now = new Date();
  const topBattlesPayload = topDefined
    ? wrapGuildBattleListCache(lists.topBattles!)
    : existing.topBattlesPayload;
  const recentBattlesPayload = recentDefined
    ? wrapGuildBattleListCache(lists.recentBattles!)
    : existing.recentBattlesPayload;

  const cacheComplete = isGuildBattleCacheComplete(
    recentBattlesPayload,
    topBattlesPayload
  );

  await db
    .update(schema.guilds)
    .set({
      ...(topDefined
        ? { topBattlesPayload: wrapGuildBattleListCache(lists.topBattles!) }
        : {}),
      ...(recentDefined
        ? {
            recentBattlesPayload: wrapGuildBattleListCache(
              lists.recentBattles!
            ),
          }
        : {}),
      ...(cacheComplete ? { battlesLastSyncedAt: now } : {}),
      updatedAt: now,
    })
    .where(eq(schema.guilds.id, existing.id));
}

export async function cacheAllianceBattleLists(
  region: AlbionRegion,
  allianceId: string,
  lists: {
    topBattles?: GuildBattleSummary[];
    recentBattles?: GuildBattleSummary[];
  }
): Promise<void> {
  const existing = await getAllianceByAlbionId(region, allianceId);
  if (!existing) return;

  const topDefined = lists.topBattles !== undefined;
  const recentDefined = lists.recentBattles !== undefined;
  if (!topDefined && !recentDefined) return;

  const now = new Date();
  const topBattlesPayload = topDefined
    ? wrapGuildBattleListCache(lists.topBattles!)
    : existing.topBattlesPayload;
  const recentBattlesPayload = recentDefined
    ? wrapGuildBattleListCache(lists.recentBattles!)
    : existing.recentBattlesPayload;

  const cacheComplete = isGuildBattleCacheComplete(
    recentBattlesPayload,
    topBattlesPayload
  );

  await db
    .update(schema.alliances)
    .set({
      ...(topDefined ? { topBattlesPayload } : {}),
      ...(recentDefined ? { recentBattlesPayload } : {}),
      ...(cacheComplete ? { battlesLastSyncedAt: now } : {}),
      updatedAt: now,
    })
    .where(eq(schema.alliances.id, existing.id));
}

export async function getAllianceByAlbionId(
  region: AlbionRegion,
  albionId: string
) {
  return db.query.alliances.findFirst({
    where: and(
      eq(schema.alliances.region, region),
      eq(schema.alliances.albionId, albionId)
    ),
  });
}

export async function getPlayerKillHistoryFromDb(
  playerUuid: string,
  limit = 10
) {
  const events = await db.query.killEvents.findMany({
    where: and(
      eq(schema.killEvents.killerId, playerUuid),
      killFamePositiveCondition()
    ),
    orderBy: [desc(schema.killEvents.occurredAt)],
    limit,
    with: {
      killer: { with: { guild: true } },
      victim: { with: { guild: true } },
    },
  });

  return events.map(mapKillEventToCard);
}

export async function getPlayerDeathHistoryFromDb(
  playerUuid: string,
  limit = 10
) {
  const events = await db.query.killEvents.findMany({
    where: and(
      eq(schema.killEvents.victimId, playerUuid),
      killFamePositiveCondition()
    ),
    orderBy: [desc(schema.killEvents.occurredAt)],
    limit,
    with: {
      killer: { with: { guild: true } },
      victim: { with: { guild: true } },
    },
  });

  return events.map(mapKillEventToCard);
}

export async function getPlayerHistoryFromDb(
  region: AlbionRegion,
  albionId: string,
  limit = 10
) {
  const player = await getPlayerByAlbionId(region, albionId);
  if (!player) {
    return { kills: [], deaths: [], player: null };
  }

  const [kills, deaths] = await Promise.all([
    getPlayerKillHistoryFromDb(player.id, limit),
    getPlayerDeathHistoryFromDb(player.id, limit),
  ]);

  return { kills, deaths, player };
}

export async function getPlayerAnalytics(
  region: AlbionRegion,
  albionId: string
): Promise<PlayerAnalytics> {
  const player = await getPlayerByAlbionId(region, albionId);
  if (!player) return EMPTY_PLAYER_ANALYTICS;

  const cutoff = getLast30DaysCutoff();
  const playerId = player.id;

  const [
    activityRows,
    fameEarnedRows,
    fameLostRows,
    contentMixRows,
    buildParticipationRows,
  ] = await Promise.all([
    db
      .select({
        day: sql<string>`date(${schema.killEvents.occurredAt})`.as("day"),
        events: sql<number>`count(distinct ${schema.killEvents.id})`.as(
          "events"
        ),
        kills: sql<number>`count(*) filter (where ${schema.killParticipants.role} = 'killer')`.as(
          "kills"
        ),
        deaths: sql<number>`count(*) filter (where ${schema.killParticipants.role} = 'victim')`.as(
          "deaths"
        ),
      })
      .from(schema.killParticipants)
      .innerJoin(
        schema.killEvents,
        eq(schema.killEvents.id, schema.killParticipants.eventId)
      )
      .where(
        and(
          eq(schema.killParticipants.playerId, playerId),
          gte(schema.killEvents.occurredAt, cutoff)
        )
      )
      .groupBy(sql`date(${schema.killEvents.occurredAt})`),
    db
      .select({
        day: sql<string>`date(${schema.killEvents.occurredAt})`.as("day"),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .where(
        and(
          eq(schema.killEvents.killerId, playerId),
          gte(schema.killEvents.occurredAt, cutoff)
        )
      )
      .groupBy(sql`date(${schema.killEvents.occurredAt})`),
    db
      .select({
        day: sql<string>`date(${schema.killEvents.occurredAt})`.as("day"),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .where(
        and(
          eq(schema.killEvents.victimId, playerId),
          gte(schema.killEvents.occurredAt, cutoff)
        )
      )
      .groupBy(sql`date(${schema.killEvents.occurredAt})`),
    db
      .select({
        contentType: schema.killEvents.contentType,
        count: count(),
      })
      .from(schema.killEvents)
      .where(
        and(
          or(
            eq(schema.killEvents.killerId, playerId),
            eq(schema.killEvents.victimId, playerId)
          ),
          gte(schema.killEvents.occurredAt, cutoff)
        )
      )
      .groupBy(schema.killEvents.contentType),
    db
      .select({
        eventId: schema.killEvents.id,
        rawPayload: schema.killParticipants.rawPayload,
      })
      .from(schema.killParticipants)
      .innerJoin(
        schema.killEvents,
        eq(schema.killEvents.id, schema.killParticipants.eventId)
      )
      .where(
        and(
          eq(schema.killParticipants.playerId, playerId),
          gte(schema.killEvents.occurredAt, cutoff)
        )
      ),
  ]);

  const activity: PlayerActivityDay[] = activityRows
    .map((row) => ({
      day: toDateKey(row.day),
      events: Number(row.events),
      kills: Number(row.kills),
      deaths: Number(row.deaths),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const fameByDayMap = new Map<string, PlayerFameDay>();
  for (const row of fameEarnedRows) {
    const day = toDateKey(row.day);
    const existing = fameByDayMap.get(day) ?? { day, earned: 0, lost: 0 };
    existing.earned = Number(row.fame ?? 0);
    fameByDayMap.set(day, existing);
  }
  for (const row of fameLostRows) {
    const day = toDateKey(row.day);
    const existing = fameByDayMap.get(day) ?? { day, earned: 0, lost: 0 };
    existing.lost = Number(row.fame ?? 0);
    fameByDayMap.set(day, existing);
  }

  const buildSamples: PlayerBuildItem[][] = [];
  const seenEvents = new Set<string>();
  for (const row of buildParticipationRows) {
    // One build sample per event (matches distinct-event activity counting)
    if (seenEvents.has(row.eventId)) continue;
    seenEvents.add(row.eventId);

    const ordered = extractBuildItemsFromParticipantPayload(row.rawPayload);
    if (ordered.length === 0) continue;
    buildSamples.push(ordered);
  }

  const topBuilds = aggregateTopBuilds(buildSamples);

  return {
    activity,
    fameByDay: [...fameByDayMap.values()].sort((a, b) =>
      a.day.localeCompare(b.day)
    ),
    contentMix: contentMixRows.map((row) => ({
      contentType: row.contentType,
      count: Number(row.count),
    })),
    topBuilds,
  };
}

export async function getGuildTopKillsFromDb(
  region: AlbionRegion,
  guildAlbionId: string,
  limit = 10
) {
  const guild = await getGuildByAlbionId(region, guildAlbionId);
  if (!guild) return [];

  const guildPlayers = await db.query.players.findMany({
    where: eq(schema.players.guildId, guild.id),
    columns: { id: true },
  });

  const playerIds = guildPlayers.map((p) => p.id);
  if (playerIds.length === 0) return [];

  const events = await db.query.killEvents.findMany({
    where: and(
      eq(schema.killEvents.region, region),
      inArray(schema.killEvents.killerId, playerIds),
      killFamePositiveCondition()
    ),
    orderBy: [desc(schema.killEvents.totalVictimKillFame)],
    limit,
    with: {
      killer: { with: { guild: true } },
      victim: { with: { guild: true } },
    },
  });

  return events.map(mapKillEventToCard);
}

export async function getAllianceTopKillsFromDb(
  region: AlbionRegion,
  allianceAlbionId: string,
  limit = 10
) {
  const memberGuilds = await db.query.guilds.findMany({
    where: and(
      eq(schema.guilds.region, region),
      eq(schema.guilds.allianceId, allianceAlbionId)
    ),
    columns: { id: true, killFame: true, deathFame: true },
  });

  const guildUuids = memberGuilds.map((g) => g.id);
  if (guildUuids.length === 0) return [];

  const guildPlayers = await db.query.players.findMany({
    where: inArray(schema.players.guildId, guildUuids),
    columns: { id: true },
  });

  const playerIds = guildPlayers.map((p) => p.id);
  if (playerIds.length === 0) return [];

  const events = await db.query.killEvents.findMany({
    where: and(
      eq(schema.killEvents.region, region),
      inArray(schema.killEvents.killerId, playerIds),
      killFamePositiveCondition()
    ),
    orderBy: [desc(schema.killEvents.totalVictimKillFame)],
    limit,
    with: {
      killer: { with: { guild: true } },
      victim: { with: { guild: true } },
    },
  });

  return events.map(mapKillEventToCard);
}

/** Sum kill/death fame from current member guilds (membership-now). */
export async function getAllianceFameFromMemberGuilds(
  region: AlbionRegion,
  allianceAlbionId: string
): Promise<{ killFame: number; deathFame: number }> {
  const rows = await db
    .select({
      killFame: sum(schema.guilds.killFame),
      deathFame: sum(schema.guilds.deathFame),
    })
    .from(schema.guilds)
    .where(
      and(
        eq(schema.guilds.region, region),
        eq(schema.guilds.allianceId, allianceAlbionId)
      )
    );

  return {
    killFame: Number(rows[0]?.killFame ?? 0),
    deathFame: Number(rows[0]?.deathFame ?? 0),
  };
}

/**
 * Recent kills between two guilds using snapshot participant guild names
 * (guild at time of kill), not current player membership.
 */
export async function getGuildFeudKillsFromDb(
  region: AlbionRegion,
  guildNameA: string,
  guildNameB: string,
  options: { limit?: number; excludeEventId?: number } = {}
) {
  const { limit = 10, excludeEventId } = options;
  const nameA = guildNameA.trim().toLowerCase();
  const nameB = guildNameB.trim().toLowerCase();
  if (!nameA || !nameB || nameA === nameB) return [];

  const killerPart = alias(schema.killParticipants, "feud_killer");
  const victimPart = alias(schema.killParticipants, "feud_victim");

  const rows = await db
    .select({ id: schema.killEvents.id })
    .from(schema.killEvents)
    .innerJoin(
      killerPart,
      and(
        eq(killerPart.eventId, schema.killEvents.id),
        eq(killerPart.role, "killer")
      )
    )
    .innerJoin(
      victimPart,
      and(
        eq(victimPart.eventId, schema.killEvents.id),
        eq(victimPart.role, "victim")
      )
    )
    .where(
      and(
        eq(schema.killEvents.region, region),
        killFamePositiveCondition(),
        excludeEventId != null
          ? ne(schema.killEvents.eventId, excludeEventId)
          : undefined,
        or(
          and(
            sql`lower(trim(${killerPart.guildName})) = ${nameA}`,
            sql`lower(trim(${victimPart.guildName})) = ${nameB}`
          ),
          and(
            sql`lower(trim(${killerPart.guildName})) = ${nameB}`,
            sql`lower(trim(${victimPart.guildName})) = ${nameA}`
          )
        )
      )
    )
    .orderBy(desc(schema.killEvents.occurredAt))
    .limit(limit);

  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return [];

  const events = await db.query.killEvents.findMany({
    where: inArray(schema.killEvents.id, ids),
    with: {
      killer: { with: { guild: true } },
      victim: { with: { guild: true } },
    },
  });

  const byId = new Map(events.map((event) => [event.id, event]));
  return ids
    .map((id) => byId.get(id))
    .filter((event): event is NonNullable<typeof event> => event != null)
    .map(mapKillEventToCard);
}

export async function getAllianceProfileFromDb(
  region: AlbionRegion,
  allianceId: string
) {
  const alliance = await getAllianceByAlbionId(region, allianceId);
  if (!alliance) return null;

  const normalized = normalizeAllianceInfo(
    alliance.rawPayload as AlbionAllianceInfo | null
  );

  const info: NormalizedAllianceInfo =
    normalized ?? {
      id: alliance.albionId,
      name: alliance.name,
      tag: alliance.tag,
      founderId: alliance.founderId,
      founderName: alliance.founderName,
      founded: alliance.founded,
      memberCount: alliance.memberCount,
      guilds: alliance.guildsJson as NormalizedAllianceInfo["guilds"],
    };

  const guilds = parseAllianceGuilds(info);

  return {
    alliance,
    info,
    guilds,
    memberCount: alliance.memberCount,
  };
}

export async function searchLocal(query: string, limit = 20) {
  const pattern = `%${query}%`;
  const regionFilter =
    ENABLED_REGIONS.length === 0
      ? sql`false`
      : inArray(schema.players.region, ENABLED_REGIONS);
  const guildRegionFilter =
    ENABLED_REGIONS.length === 0
      ? sql`false`
      : inArray(schema.guilds.region, ENABLED_REGIONS);
  const allianceRegionFilter =
    ENABLED_REGIONS.length === 0
      ? sql`false`
      : inArray(schema.alliances.region, ENABLED_REGIONS);

  const [players, guilds, alliances] = await Promise.all([
    db.query.players.findMany({
      where: and(ilike(schema.players.name, pattern), regionFilter),
      limit,
      with: { guild: true },
    }),
    db.query.guilds.findMany({
      where: and(ilike(schema.guilds.name, pattern), guildRegionFilter),
      limit,
    }),
    db.query.alliances.findMany({
      where: and(
        allianceRegionFilter,
        or(
          ilike(schema.alliances.name, pattern),
          ilike(schema.alliances.tag, pattern)
        )
      ),
      limit,
    }),
  ]);

  return { players, guilds, alliances };
}

export async function getApiSyncState() {
  if (ENABLED_REGIONS.length === 0) return [];
  return db.query.apiSyncState.findMany({
    where: inArray(schema.apiSyncState.region, ENABLED_REGIONS),
  });
}

export interface RegionEntityCounts {
  region: AlbionRegion;
  players: number;
  guilds: number;
  kills: number;
  battles: number;
}

export async function getRegionEntityCounts(): Promise<RegionEntityCounts[]> {
  if (ENABLED_REGIONS.length === 0) return [];

  const [playerRows, guildRows, killRows, battleRows] = await Promise.all([
    db
      .select({
        region: schema.players.region,
        count: count(),
      })
      .from(schema.players)
      .where(inArray(schema.players.region, ENABLED_REGIONS))
      .groupBy(schema.players.region),
    db
      .select({
        region: schema.guilds.region,
        count: count(),
      })
      .from(schema.guilds)
      .where(inArray(schema.guilds.region, ENABLED_REGIONS))
      .groupBy(schema.guilds.region),
    db
      .select({
        region: schema.killEvents.region,
        count: count(),
      })
      .from(schema.killEvents)
      .where(inArray(schema.killEvents.region, ENABLED_REGIONS))
      .groupBy(schema.killEvents.region),
    db
      .select({
        region: schema.battles.region,
        count: count(),
      })
      .from(schema.battles)
      .where(inArray(schema.battles.region, ENABLED_REGIONS))
      .groupBy(schema.battles.region),
  ]);

  const playersByRegion = new Map(
    playerRows.map((row) => [row.region, row.count])
  );
  const guildsByRegion = new Map(guildRows.map((row) => [row.region, row.count]));
  const killsByRegion = new Map(killRows.map((row) => [row.region, row.count]));
  const battlesByRegion = new Map(
    battleRows.map((row) => [row.region, row.count])
  );

  return ENABLED_REGIONS.map((region) => ({
    region,
    players: playersByRegion.get(region) ?? 0,
    guilds: guildsByRegion.get(region) ?? 0,
    kills: killsByRegion.get(region) ?? 0,
    battles: battlesByRegion.get(region) ?? 0,
  }));
}

export { getGlobalSyncStatus, getLatestKillAtByRegion } from "@/lib/health/sync-status";

export async function incrementEventsIngested(region: AlbionRegion, count: number) {
  await db
    .update(schema.apiSyncState)
    .set({
      eventsIngestedLastHour: sql`${schema.apiSyncState.eventsIngestedLastHour} + ${count}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.apiSyncState.region, region));
}

/** Sitemap helpers — lean selects only. */

export interface SitemapEntityRow {
  albionId: string;
  region: AlbionRegion;
  updatedAt: Date | null;
}

export interface SitemapNumericEntityRow {
  entityId: number;
  region: AlbionRegion;
  updatedAt: Date | null;
}

const SITEMAP_KILL_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

export async function countSitemapPlayers(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(schema.players)
    .where(isNotNull(schema.players.lastSyncedAt));
  return row?.value ?? 0;
}

export async function countSitemapGuilds(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(schema.guilds)
    .where(isNotNull(schema.guilds.lastSyncedAt));
  return row?.value ?? 0;
}

export async function countSitemapAlliances(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(schema.alliances)
    .where(isNotNull(schema.alliances.lastSyncedAt));
  return row?.value ?? 0;
}

export async function countSitemapKills(): Promise<number> {
  const cutoff = new Date(Date.now() - SITEMAP_KILL_LOOKBACK_MS);
  const [row] = await db
    .select({ value: count() })
    .from(schema.killEvents)
    .where(gte(schema.killEvents.occurredAt, cutoff));
  return row?.value ?? 0;
}

export async function countSitemapBattles(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(schema.battles);
  return row?.value ?? 0;
}

export async function listSitemapPlayers(
  offset: number,
  limit: number
): Promise<SitemapEntityRow[]> {
  return db
    .select({
      albionId: schema.players.albionId,
      region: schema.players.region,
      updatedAt: schema.players.updatedAt,
    })
    .from(schema.players)
    .where(isNotNull(schema.players.lastSyncedAt))
    .orderBy(desc(schema.players.killFame), desc(schema.players.updatedAt))
    .offset(offset)
    .limit(limit);
}

export async function listSitemapGuilds(
  offset: number,
  limit: number
): Promise<SitemapEntityRow[]> {
  return db
    .select({
      albionId: schema.guilds.albionId,
      region: schema.guilds.region,
      updatedAt: schema.guilds.updatedAt,
    })
    .from(schema.guilds)
    .where(isNotNull(schema.guilds.lastSyncedAt))
    .orderBy(desc(schema.guilds.killFame), desc(schema.guilds.updatedAt))
    .offset(offset)
    .limit(limit);
}

export async function listSitemapAlliances(
  offset: number,
  limit: number
): Promise<SitemapEntityRow[]> {
  return db
    .select({
      albionId: schema.alliances.albionId,
      region: schema.alliances.region,
      updatedAt: schema.alliances.updatedAt,
    })
    .from(schema.alliances)
    .where(isNotNull(schema.alliances.lastSyncedAt))
    .orderBy(desc(schema.alliances.updatedAt))
    .offset(offset)
    .limit(limit);
}

export async function listSitemapKills(
  offset: number,
  limit: number
): Promise<SitemapNumericEntityRow[]> {
  const cutoff = new Date(Date.now() - SITEMAP_KILL_LOOKBACK_MS);
  const rows = await db
    .select({
      entityId: schema.killEvents.eventId,
      region: schema.killEvents.region,
      updatedAt: schema.killEvents.occurredAt,
    })
    .from(schema.killEvents)
    .where(gte(schema.killEvents.occurredAt, cutoff))
    .orderBy(desc(schema.killEvents.totalVictimKillFame), desc(schema.killEvents.occurredAt))
    .offset(offset)
    .limit(limit);
  return rows;
}

export async function listSitemapBattles(
  offset: number,
  limit: number
): Promise<SitemapNumericEntityRow[]> {
  const rows = await db
    .select({
      entityId: schema.battles.albionBattleId,
      region: schema.battles.region,
      updatedAt: schema.battles.lastSyncedAt,
    })
    .from(schema.battles)
    .orderBy(desc(schema.battles.totalFame), desc(schema.battles.startTime))
    .offset(offset)
    .limit(limit);
  return rows;
}

function sortParticipantsByFame<T extends { killFame: number; kills: number }>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) => b.killFame - a.killFame || b.kills - a.kills
  );
}

function extractBattlesFeedParticipants(
  rawPayload: unknown,
  detailPayload: unknown
): Pick<
  BattlesFeedItem,
  "alliances" | "guilds" | "allianceCount" | "guildCount"
> {
  const detail =
    detailPayload && typeof detailPayload === "object"
      ? (detailPayload as {
          alliances?: AlbionBattleAllianceStats[];
          guilds?: AlbionBattleGuildStats[];
        })
      : null;

  let alliances: AlbionBattleAllianceStats[] = [];
  let guilds: AlbionBattleGuildStats[] = [];

  if (Array.isArray(detail?.alliances) && Array.isArray(detail?.guilds)) {
    alliances = detail.alliances;
    guilds = detail.guilds;
  } else if (rawPayload && typeof rawPayload === "object") {
    const battle = rawPayload as AlbionBattle;
    alliances = battle.alliances ? Object.values(battle.alliances) : [];
    guilds = battle.guilds ? Object.values(battle.guilds) : [];
  }

  const sortedAlliances = sortParticipantsByFame(alliances);
  const sortedGuilds = sortParticipantsByFame(guilds);

  return {
    alliances: sortedAlliances.slice(0, BATTLES_FEED_PREVIEW_LIMIT).map((a) => ({
      id: a.id,
      name: a.name,
    })),
    guilds: sortedGuilds.slice(0, BATTLES_FEED_PREVIEW_LIMIT).map((g) => ({
      id: g.id,
      name: g.name,
    })),
    allianceCount: sortedAlliances.length,
    guildCount: sortedGuilds.length,
  };
}

export const getBattlesFeed = cache(async function getBattlesFeed(
  filters: BattlesFeedFilters = {}
): Promise<BattlesFeedItem[]> {
  const { region = "all", q, limit = 20, offset = 0 } = filters;
  const where = battlesFeedWhere(region, q);

  const rows = await db
    .select({
      id: schema.battles.albionBattleId,
      region: schema.battles.region,
      startTime: schema.battles.startTime,
      totalFame: schema.battles.totalFame,
      totalKills: schema.battles.totalKills,
      totalPlayers: schema.battles.totalPlayers,
      rawPayload: schema.battles.rawPayload,
      detailPayload: schema.battles.detailPayload,
    })
    .from(schema.battles)
    .where(where)
    .orderBy(
      sql`${schema.battles.startTime} DESC NULLS LAST`,
      desc(schema.battles.createdAt)
    )
    .offset(offset)
    .limit(limit);

  return rows.map((row) => {
    const participants = extractBattlesFeedParticipants(
      row.rawPayload,
      row.detailPayload
    );
    return {
      id: row.id,
      region: row.region,
      startTime: row.startTime ? row.startTime.toISOString() : null,
      totalFame: row.totalFame,
      totalKills: row.totalKills,
      totalPlayers: row.totalPlayers,
      ...participants,
    };
  });
});

export const countBattlesFeed = cache(async function countBattlesFeed(
  filters: Pick<BattlesFeedFilters, "region" | "q"> = {}
): Promise<number> {
  const { region = "all", q } = filters;
  const where = battlesFeedWhere(region, q);
  const [row] = await db
    .select({ value: count() })
    .from(schema.battles)
    .where(where);
  return row?.value ?? 0;
});

/**
 * Find battles near the selected set by time window, then score by guild/alliance overlap.
 */
export async function getRelatedBattlesFeed(input: {
  region: AlbionRegion;
  selectedIds: number[];
  limit?: number;
}): Promise<ReturnType<typeof scoreRelatedBattles>> {
  const { region, selectedIds, limit = 5 } = input;
  if (selectedIds.length === 0) return [];

  const selectedRows = await db
    .select({
      id: schema.battles.albionBattleId,
      region: schema.battles.region,
      startTime: schema.battles.startTime,
      totalFame: schema.battles.totalFame,
      totalKills: schema.battles.totalKills,
      totalPlayers: schema.battles.totalPlayers,
      rawPayload: schema.battles.rawPayload,
      detailPayload: schema.battles.detailPayload,
    })
    .from(schema.battles)
    .where(
      and(
        eq(schema.battles.region, region),
        inArray(schema.battles.albionBattleId, selectedIds)
      )
    );

  if (selectedRows.length === 0) return [];

  const selected: BattlesFeedItem[] = selectedRows.map((row) => {
    const participants = extractBattlesFeedParticipants(
      row.rawPayload,
      row.detailPayload
    );
    return {
      id: row.id,
      region: row.region,
      startTime: row.startTime ? row.startTime.toISOString() : null,
      totalFame: row.totalFame,
      totalKills: row.totalKills,
      totalPlayers: row.totalPlayers,
      ...participants,
    };
  });

  const times = selected
    .map((b) => (b.startTime ? new Date(b.startTime).getTime() : null))
    .filter((t): t is number => t != null && !Number.isNaN(t));

  const windowConditions = [
    eq(schema.battles.region, region),
    // Exclude selected ids
    sql`${schema.battles.albionBattleId} NOT IN (${sql.join(
      selectedIds.map((id) => sql`${id}`),
      sql`, `
    )})`,
  ];

  if (times.length > 0) {
    const minTime = new Date(Math.min(...times) - RELATED_BATTLE_WINDOW_MS);
    const maxTime = new Date(Math.max(...times) + RELATED_BATTLE_WINDOW_MS);
    windowConditions.push(
      gte(schema.battles.startTime, minTime),
      lte(schema.battles.startTime, maxTime)
    );
  }

  const candidateRows = await db
    .select({
      id: schema.battles.albionBattleId,
      region: schema.battles.region,
      startTime: schema.battles.startTime,
      totalFame: schema.battles.totalFame,
      totalKills: schema.battles.totalKills,
      totalPlayers: schema.battles.totalPlayers,
      rawPayload: schema.battles.rawPayload,
      detailPayload: schema.battles.detailPayload,
    })
    .from(schema.battles)
    .where(and(...windowConditions))
    .orderBy(desc(schema.battles.totalFame))
    .limit(40);

  const candidates: BattlesFeedItem[] = candidateRows.map((row) => {
    const participants = extractBattlesFeedParticipants(
      row.rawPayload,
      row.detailPayload
    );
    return {
      id: row.id,
      region: row.region,
      startTime: row.startTime ? row.startTime.toISOString() : null,
      totalFame: row.totalFame,
      totalKills: row.totalKills,
      totalPlayers: row.totalPlayers,
      ...participants,
    };
  });

  return scoreRelatedBattles(selected, candidates, { limit });
}

export interface MetaBuildItem {
  slot: string;
  itemType: string;
  quality: number;
}

export interface MetaBuildEntry {
  rank: number;
  kills: number;
  deaths: number;
  assists: number;
  appearances: number;
  totalFame: number;
  avgFame: number;
  avgIp: number;
  uniquePlayers: number;
  avgParticipantCount: number;
  items: MetaBuildItem[];
}

export interface MetaWeaponEntry {
  itemType: string;
  appearances: number;
  kills: number;
  assists: number;
  usesByContentType: Record<ContentType, number>;
}

export interface MetaBuildsResult {
  windowDays: number;
  totalEvents: number;
  totalAppearances: number;
  totalFame: number;
  uniqueBuilds: number;
  contentMix: PlayerContentMixEntry[];
  byContentType: Record<ContentType, MetaBuildEntry[]>;
  topWeapons: MetaWeaponEntry[];
}

type MetaBuildRole = "killer" | "victim" | "assist";

interface MetaBuildSample {
  contentType: ContentType;
  role: MetaBuildRole;
  fame: number;
  ip: number;
  participantCount: number;
  playerId: string | null;
  items: PlayerBuildItem[];
}

interface MetaBuildAccumulator {
  kills: number;
  deaths: number;
  assists: number;
  totalFame: number;
  ipSum: number;
  ipSamples: number;
  participantSum: number;
  players: Set<string>;
  items: PlayerBuildItem[];
}

const META_BUILD_CONTENT_TYPES: ContentType[] = ["SOLO", "GROUP", "ZVZ"];
/** Higher than killer/victim-only sampling — ZvZ assists multiply rows per event. */
const META_BUILD_SAMPLE_PER_TYPE = 12_000;
const META_BUILDS_PER_TYPE = 12;
const META_TOP_WEAPONS = 8;
/** Top weapons considered per content type before merging duplicates. */
const META_TOP_WEAPONS_PER_TYPE = 4;

const META_ROLE_PRIORITY: Record<MetaBuildRole, number> = {
  killer: 3,
  victim: 2,
  assist: 1,
};

function normalizeMetaBuildRole(
  role: "killer" | "victim" | "group_member" | "participant"
): MetaBuildRole {
  if (role === "killer" || role === "victim") return role;
  return "assist";
}

function preferMetaBuildRole(
  current: MetaBuildRole,
  candidate: MetaBuildRole
): MetaBuildRole {
  return META_ROLE_PRIORITY[candidate] > META_ROLE_PRIORITY[current]
    ? candidate
    : current;
}

function emptyMetaBuildAccumulator(items: PlayerBuildItem[]): MetaBuildAccumulator {
  return {
    kills: 0,
    deaths: 0,
    assists: 0,
    totalFame: 0,
    ipSum: 0,
    ipSamples: 0,
    participantSum: 0,
    players: new Set(),
    items,
  };
}

function aggregateMetaBuilds(
  samples: MetaBuildSample[],
  limit: number
): MetaBuildEntry[] {
  const fullByWeapon = new Map<string, PlayerBuildItem[]>();

  for (const sample of samples) {
    if (isSparseBuild(sample.items)) continue;
    const mainHand = getMainHandItem(sample.items);
    if (!mainHand) continue;
    const weaponKey = itemFamilyKey(mainHand.itemType);
    const existing = fullByWeapon.get(weaponKey);
    if (!existing) {
      fullByWeapon.set(weaponKey, sample.items);
    } else {
      fullByWeapon.set(weaponKey, preferBuildItems(existing, sample.items));
    }
  }

  const byFingerprint = new Map<string, MetaBuildAccumulator>();

  for (const sample of samples) {
    let resolved = sample.items;
    if (isSparseBuild(sample.items)) {
      const mainHand = getMainHandItem(sample.items);
      const full = mainHand
        ? fullByWeapon.get(itemFamilyKey(mainHand.itemType))
        : undefined;
      if (full) resolved = full;
    }

    const key = buildFingerprint(resolved);
    if (!key) continue;

    const existing = byFingerprint.get(key);
    const acc = existing ?? emptyMetaBuildAccumulator(resolved);
    if (!existing) byFingerprint.set(key, acc);

    acc.items = preferBuildItems(acc.items, resolved);
    acc.participantSum += sample.participantCount;
    if (sample.playerId) acc.players.add(sample.playerId);
    if (sample.ip > 0) {
      acc.ipSum += sample.ip;
      acc.ipSamples += 1;
    }

    if (sample.role === "killer") {
      acc.kills += 1;
      acc.totalFame += sample.fame;
    } else if (sample.role === "victim") {
      acc.deaths += 1;
    } else {
      acc.assists += 1;
    }
  }

  return [...byFingerprint.values()]
    .map((acc) => {
      const appearances = acc.kills + acc.deaths + acc.assists;
      return {
        kills: acc.kills,
        deaths: acc.deaths,
        assists: acc.assists,
        appearances,
        totalFame: acc.totalFame,
        avgFame: acc.kills > 0 ? acc.totalFame / acc.kills : 0,
        avgIp: acc.ipSamples > 0 ? acc.ipSum / acc.ipSamples : 0,
        uniquePlayers: acc.players.size,
        avgParticipantCount:
          appearances > 0 ? acc.participantSum / appearances : 0,
        items: canonicalizeBuildItems(acc.items),
      };
    })
    .sort(
      (a, b) =>
        b.appearances - a.appearances ||
        b.uniquePlayers - a.uniquePlayers ||
        b.kills - a.kills ||
        b.totalFame - a.totalFame
    )
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * Global build meta from recent kill participants (killers, victims, and
 * assists), split by content type. Ranked by usage so support/tank/healer
 * loadouts surface even without last-hits. Same weapons/gear across tiers
 * are combined (matches player analytics).
 */
export async function getMetaBuilds(options?: {
  region?: AlbionRegion | "all";
  days?: number;
  limitPerType?: number;
}): Promise<MetaBuildsResult> {
  const region = options?.region ?? "all";
  const days = Math.min(Math.max(options?.days ?? 30, 1), 30);
  const limitPerType = options?.limitPerType ?? META_BUILDS_PER_TYPE;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [contentMixRows, ...sampleRowGroups] = await Promise.all([
    db
      .select({
        contentType: schema.killEvents.contentType,
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .where(
        and(
          gte(schema.killEvents.occurredAt, cutoff),
          killFamePositiveCondition(),
          regionCondition(region)
        )
      )
      .groupBy(schema.killEvents.contentType),
    ...META_BUILD_CONTENT_TYPES.map((contentType) =>
      db
        .select({
          eventId: schema.killEvents.id,
          contentType: schema.killEvents.contentType,
          role: schema.killParticipants.role,
          fame: schema.killEvents.totalVictimKillFame,
          ip: schema.killParticipants.averageItemPower,
          participantCount: schema.killEvents.participantCount,
          playerId: schema.killParticipants.playerId,
          rawPayload: schema.killParticipants.rawPayload,
        })
        .from(schema.killParticipants)
        .innerJoin(
          schema.killEvents,
          eq(schema.killEvents.id, schema.killParticipants.eventId)
        )
        .where(
          and(
            gte(schema.killEvents.occurredAt, cutoff),
            eq(schema.killEvents.contentType, contentType),
            killFamePositiveCondition(),
            regionCondition(region),
            inArray(schema.killParticipants.role, [
              "killer",
              "victim",
              "group_member",
              "participant",
            ])
          )
        )
        .orderBy(desc(schema.killEvents.occurredAt))
        .limit(META_BUILD_SAMPLE_PER_TYPE)
    ),
  ]);

  const byContentType = {
    SOLO: [] as MetaBuildEntry[],
    GROUP: [] as MetaBuildEntry[],
    ZVZ: [] as MetaBuildEntry[],
  };
  const weaponCounts = new Map<
    string,
    {
      itemType: string;
      appearances: number;
      kills: number;
      assists: number;
      contentType: ContentType;
    }
  >();
  let uniqueBuilds = 0;
  let totalAppearances = 0;

  for (let i = 0; i < META_BUILD_CONTENT_TYPES.length; i++) {
    const contentType = META_BUILD_CONTENT_TYPES[i];
    const rows = sampleRowGroups[i] ?? [];
    /** One loadout per player per event (killer/victim/assist overlap). */
    const byPlayerEvent = new Map<string, MetaBuildSample>();

    for (const row of rows) {
      if (
        row.role !== "killer" &&
        row.role !== "victim" &&
        row.role !== "group_member" &&
        row.role !== "participant"
      ) {
        continue;
      }

      const items = extractBuildItemsFromParticipantPayload(row.rawPayload);
      if (items.length === 0) continue;

      const role = normalizeMetaBuildRole(row.role);
      const dedupeKey = row.playerId
        ? `${row.eventId}:${row.playerId}`
        : `${row.eventId}:${role}:${buildFingerprint(items)}`;
      const existing = byPlayerEvent.get(dedupeKey);

      if (existing) {
        existing.items = preferBuildItems(existing.items, items);
        existing.role = preferMetaBuildRole(existing.role, role);
        if (Number(row.ip ?? 0) > existing.ip) {
          existing.ip = Number(row.ip ?? 0);
        }
        continue;
      }

      byPlayerEvent.set(dedupeKey, {
        contentType,
        role,
        fame: Number(row.fame ?? 0),
        ip: Number(row.ip ?? 0),
        participantCount: Number(row.participantCount ?? 0),
        playerId: row.playerId,
        items,
      });
    }

    const samples = [...byPlayerEvent.values()];
    totalAppearances += samples.length;

    for (const sample of samples) {
      const mainHand = getMainHandItem(sample.items);
      if (!mainHand) continue;
      const family = itemFamilyKey(mainHand.itemType);
      const weaponKey = `${contentType}:${family}`;
      const existing = weaponCounts.get(weaponKey);
      if (existing) {
        existing.appearances += 1;
        if (sample.role === "killer") existing.kills += 1;
        if (sample.role === "assist") existing.assists += 1;
      } else {
        weaponCounts.set(weaponKey, {
          itemType: canonicalizeItemType(mainHand.itemType),
          appearances: 1,
          kills: sample.role === "killer" ? 1 : 0,
          assists: sample.role === "assist" ? 1 : 0,
          contentType,
        });
      }
    }

    const builds = aggregateMetaBuilds(samples, limitPerType);
    byContentType[contentType] = builds;
    uniqueBuilds += builds.length;
  }

  const contentMix: PlayerContentMixEntry[] = contentMixRows.map((row) => ({
    contentType: row.contentType,
    count: Number(row.count),
  }));

  const totalEvents = contentMix.reduce((sum, entry) => sum + entry.count, 0);
  const totalFame = contentMixRows.reduce(
    (sum, row) => sum + Number(row.fame ?? 0),
    0
  );

  const contentTypeOrder: ContentType[] = ["SOLO", "GROUP", "ZVZ"];
  const emptyUsesByType = (): Record<ContentType, number> => ({
    SOLO: 0,
    GROUP: 0,
    ZVZ: 0,
  });

  const mergedWeapons = new Map<
    string,
    {
      itemType: string;
      appearances: number;
      kills: number;
      assists: number;
      usesByContentType: Record<ContentType, number>;
    }
  >();

  for (const entry of weaponCounts.values()) {
    const family = itemFamilyKey(entry.itemType);
    const existing = mergedWeapons.get(family);
    if (existing) {
      existing.appearances += entry.appearances;
      existing.kills += entry.kills;
      existing.assists += entry.assists;
      existing.usesByContentType[entry.contentType] += entry.appearances;
    } else {
      const usesByContentType = emptyUsesByType();
      usesByContentType[entry.contentType] = entry.appearances;
      mergedWeapons.set(family, {
        itemType: entry.itemType,
        appearances: entry.appearances,
        kills: entry.kills,
        assists: entry.assists,
        usesByContentType,
      });
    }
  }

  const candidateFamilies = new Set<string>();
  for (const contentType of contentTypeOrder) {
    const inType = [...weaponCounts.values()]
      .filter((entry) => entry.contentType === contentType)
      .sort(
        (a, b) =>
          b.appearances - a.appearances ||
          b.kills - a.kills
      )
      .slice(0, META_TOP_WEAPONS_PER_TYPE);

    for (const entry of inType) {
      candidateFamilies.add(itemFamilyKey(entry.itemType));
    }
  }

  const maxUsesInAnyType = (uses: Record<ContentType, number>) =>
    Math.max(uses.SOLO, uses.GROUP, uses.ZVZ);

  const topWeapons: MetaWeaponEntry[] = [...mergedWeapons.entries()]
    .filter(([family]) => candidateFamilies.has(family))
    .map(([, entry]) => ({
      itemType: entry.itemType,
      appearances: entry.appearances,
      kills: entry.kills,
      assists: entry.assists,
      usesByContentType: entry.usesByContentType,
    }))
    .sort(
      (a, b) =>
        maxUsesInAnyType(b.usesByContentType) -
          maxUsesInAnyType(a.usesByContentType) ||
        b.appearances - a.appearances ||
        b.kills - a.kills
    )
    .slice(0, META_TOP_WEAPONS);

  return {
    windowDays: days,
    totalEvents,
    totalAppearances,
    totalFame,
    uniqueBuilds,
    contentMix,
    byContentType,
    topWeapons,
  };
}

export const getTopPlayersByKillFame = cache(async function getTopPlayersByKillFame(
  filters: LeaderboardFilters = {}
) {
  const {
    region = "all",
    limit = 50,
    days = 7,
    contentType = "all",
  } = filters;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [
    ...leaderboardConditions({ region, days, contentType, limit }, cutoff),
    isNotNull(schema.killEvents.killerId),
  ];

  const rows = await db
    .select({
      killerId: schema.killEvents.killerId,
      killFame: sum(schema.killEvents.totalVictimKillFame),
      killCount: count(),
    })
    .from(schema.killEvents)
    .where(and(...conditions))
    .groupBy(schema.killEvents.killerId)
    .orderBy(desc(sum(schema.killEvents.totalVictimKillFame)))
    .limit(limit);

  const killerIds = rows
    .map((r) => r.killerId)
    .filter((id): id is string => id != null);

  if (killerIds.length === 0) return [];

  const players = await db.query.players.findMany({
    where: inArray(schema.players.id, killerIds),
    with: { guild: true },
  });
  const playerById = new Map(players.map((p) => [p.id, p]));

  return rows.reduce<TopFameEntry[]>((acc, row, index) => {
    if (!row.killerId) return acc;
    const player = playerById.get(row.killerId);
    if (!player) return acc;

    acc.push({
      rank: index + 1,
      killFame: Number(row.killFame ?? 0),
      killCount: row.killCount,
      player: {
        albionId: player.albionId,
        name: player.name,
        region: player.region,
        guild: player.guild
          ? { name: player.guild.name, albionId: player.guild.albionId }
          : null,
      },
    });
    return acc;
  }, []);
});

export const getTopGuildsByKillFame = cache(async function getTopGuildsByKillFame(
  filters: LeaderboardFilters = {}
) {
  const {
    region = "all",
    limit = 50,
    days = 7,
    contentType = "all",
  } = filters;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [
    ...leaderboardConditions({ region, days, contentType, limit }, cutoff),
    isNotNull(schema.killEvents.killerId),
    sql`${schema.killEvents.rawPayload}->'Killer'->>'GuildId' IS NOT NULL`,
    sql`trim(${schema.killEvents.rawPayload}->'Killer'->>'GuildName') <> ''`,
  ];

  const guildAlbionId = sql<string>`${schema.killEvents.rawPayload}->'Killer'->>'GuildId'`;
  const guildName = sql<string>`${schema.killEvents.rawPayload}->'Killer'->>'GuildName'`;

  const rows = await db
    .select({
      region: schema.killEvents.region,
      guildAlbionId,
      guildName,
      killFame: sum(schema.killEvents.totalVictimKillFame),
      killCount: count(),
    })
    .from(schema.killEvents)
    .where(and(...conditions))
    .groupBy(
      schema.killEvents.region,
      guildAlbionId,
      guildName
    )
    .orderBy(desc(sum(schema.killEvents.totalVictimKillFame)))
    .limit(limit);

  return rows.reduce<TopGuildEntry[]>((acc, row, index) => {
    const albionId = row.guildAlbionId?.trim();
    const name = row.guildName?.trim();
    if (!albionId || !name) return acc;

    acc.push({
      rank: index + 1,
      killFame: Number(row.killFame ?? 0),
      killCount: row.killCount,
      guild: {
        albionId,
        name,
        region: row.region,
      },
    });
    return acc;
  }, []);
});

export async function getGuildTopOpponents(
  region: AlbionRegion,
  guildName: string,
  options: { days?: number; limit?: number } = {}
) {
  const { days = 30, limit = 10 } = options;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const nameLower = guildName.trim().toLowerCase();
  if (!nameLower) return [];

  const killerPart = alias(schema.killParticipants, "rival_killer");
  const victimPart = alias(schema.killParticipants, "rival_victim");

  const [killsAgainstRows, deathsToRows] = await Promise.all([
    db
      .select({
        guildName: victimPart.guildName,
        guildAlbionId: sql<string | null>`${victimPart.rawPayload}->>'GuildId'`,
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .innerJoin(
        killerPart,
        and(
          eq(killerPart.eventId, schema.killEvents.id),
          eq(killerPart.role, "killer"),
          sql`lower(trim(${killerPart.guildName})) = ${nameLower}`
        )
      )
      .innerJoin(
        victimPart,
        and(
          eq(victimPart.eventId, schema.killEvents.id),
          eq(victimPart.role, "victim"),
          isNotNull(victimPart.guildName),
          sql`lower(trim(${victimPart.guildName})) <> ${nameLower}`
        )
      )
      .where(
        and(
          eq(schema.killEvents.region, region),
          killFamePositiveCondition(),
          gte(schema.killEvents.occurredAt, cutoff)
        )
      )
      .groupBy(victimPart.guildName, sql`${victimPart.rawPayload}->>'GuildId'`),
    db
      .select({
        guildName: killerPart.guildName,
        guildAlbionId: sql<string | null>`${killerPart.rawPayload}->>'GuildId'`,
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .innerJoin(
        victimPart,
        and(
          eq(victimPart.eventId, schema.killEvents.id),
          eq(victimPart.role, "victim"),
          sql`lower(trim(${victimPart.guildName})) = ${nameLower}`
        )
      )
      .innerJoin(
        killerPart,
        and(
          eq(killerPart.eventId, schema.killEvents.id),
          eq(killerPart.role, "killer"),
          isNotNull(killerPart.guildName),
          sql`lower(trim(${killerPart.guildName})) <> ${nameLower}`
        )
      )
      .where(
        and(
          eq(schema.killEvents.region, region),
          killFamePositiveCondition(),
          gte(schema.killEvents.occurredAt, cutoff)
        )
      )
      .groupBy(killerPart.guildName, sql`${killerPart.rawPayload}->>'GuildId'`),
  ]);

  const merged = new Map<string, GuildOpponentEntry>();

  for (const row of killsAgainstRows) {
    const name = row.guildName?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = merged.get(key) ?? {
      guildName: name,
      guildAlbionId: row.guildAlbionId?.trim() ?? null,
      killsAgainst: 0,
      fameAgainst: 0,
      deathsTo: 0,
      fameLost: 0,
    };
    existing.killsAgainst += row.count;
    existing.fameAgainst += Number(row.fame ?? 0);
    if (row.guildAlbionId?.trim()) {
      existing.guildAlbionId = row.guildAlbionId.trim();
    }
    merged.set(key, existing);
  }

  for (const row of deathsToRows) {
    const name = row.guildName?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = merged.get(key) ?? {
      guildName: name,
      guildAlbionId: row.guildAlbionId?.trim() ?? null,
      killsAgainst: 0,
      fameAgainst: 0,
      deathsTo: 0,
      fameLost: 0,
    };
    existing.deathsTo += row.count;
    existing.fameLost += Number(row.fame ?? 0);
    if (row.guildAlbionId?.trim()) {
      existing.guildAlbionId = row.guildAlbionId.trim();
    }
    merged.set(key, existing);
  }

  return [...merged.values()]
    .sort(
      (a, b) =>
        b.fameAgainst + b.fameLost - (a.fameAgainst + a.fameLost) ||
        b.killsAgainst + b.deathsTo - (a.killsAgainst + a.deathsTo)
    )
    .slice(0, limit);
}

export async function getGuildFeudStats(
  region: AlbionRegion,
  guildNameA: string,
  guildNameB: string
): Promise<GuildFeudStats> {
  const empty: GuildFeudStats = {
    aKillsB: 0,
    bKillsA: 0,
    aFameOnB: 0,
    bFameOnA: 0,
  };

  const nameA = guildNameA.trim().toLowerCase();
  const nameB = guildNameB.trim().toLowerCase();
  if (!nameA || !nameB || nameA === nameB) return empty;

  const killerPart = alias(schema.killParticipants, "feud_killer");
  const victimPart = alias(schema.killParticipants, "feud_victim");

  const [aKillsBRow, bKillsARow] = await Promise.all([
    db
      .select({
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .innerJoin(
        killerPart,
        and(
          eq(killerPart.eventId, schema.killEvents.id),
          eq(killerPart.role, "killer"),
          sql`lower(trim(${killerPart.guildName})) = ${nameA}`
        )
      )
      .innerJoin(
        victimPart,
        and(
          eq(victimPart.eventId, schema.killEvents.id),
          eq(victimPart.role, "victim"),
          sql`lower(trim(${victimPart.guildName})) = ${nameB}`
        )
      )
      .where(
        and(eq(schema.killEvents.region, region), killFamePositiveCondition())
      ),
    db
      .select({
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .innerJoin(
        killerPart,
        and(
          eq(killerPart.eventId, schema.killEvents.id),
          eq(killerPart.role, "killer"),
          sql`lower(trim(${killerPart.guildName})) = ${nameB}`
        )
      )
      .innerJoin(
        victimPart,
        and(
          eq(victimPart.eventId, schema.killEvents.id),
          eq(victimPart.role, "victim"),
          sql`lower(trim(${victimPart.guildName})) = ${nameA}`
        )
      )
      .where(
        and(eq(schema.killEvents.region, region), killFamePositiveCondition())
      ),
  ]);

  return {
    aKillsB: aKillsBRow[0]?.count ?? 0,
    bKillsA: bKillsARow[0]?.count ?? 0,
    aFameOnB: Number(aKillsBRow[0]?.fame ?? 0),
    bFameOnA: Number(bKillsARow[0]?.fame ?? 0),
  };
}

export async function getPlayerAssociations(
  region: AlbionRegion,
  albionId: string,
  options: { days?: number; limit?: number } = {}
): Promise<PlayerAssociations> {
  const { days = 30, limit = 15 } = options;
  const player = await getPlayerByAlbionId(region, albionId);
  if (!player) return { allies: [] };

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const playerId = player.id;
  const subjectPart = alias(schema.killParticipants, "assoc_subject");
  const allyPart = alias(schema.killParticipants, "assoc_ally");

  const allyRows = await db
    .select({
      playerId: allyPart.playerId,
      encounters: count(),
    })
    .from(subjectPart)
    .innerJoin(
      schema.killEvents,
      eq(schema.killEvents.id, subjectPart.eventId)
    )
    .innerJoin(
      allyPart,
      and(
        eq(allyPart.eventId, subjectPart.eventId),
        isNotNull(allyPart.playerId),
        ne(allyPart.playerId, playerId),
        inArray(allyPart.role, ["group_member", "participant"])
      )
    )
    .where(
      and(
        eq(subjectPart.playerId, playerId),
        eq(subjectPart.role, "killer"),
        gte(schema.killEvents.occurredAt, cutoff),
        killFamePositiveCondition()
      )
    )
    .groupBy(allyPart.playerId)
    .orderBy(desc(count()))
    .limit(limit);

  const allyPlayerIds = allyRows
    .map((r) => r.playerId)
    .filter((id): id is string => Boolean(id));

  if (allyPlayerIds.length === 0) {
    return { allies: [] };
  }

  const relatedPlayers = await db.query.players.findMany({
    where: inArray(schema.players.id, allyPlayerIds),
    with: { guild: true },
  });
  const playerById = new Map(relatedPlayers.map((p) => [p.id, p]));

  const allies = allyRows.reduce<PlayerAssociationEntry[]>((acc, row) => {
    if (!row.playerId) return acc;
    const related = playerById.get(row.playerId);
    if (!related) return acc;
    acc.push({
      albionId: related.albionId,
      name: related.name,
      region: related.region,
      guild: related.guild
        ? { name: related.guild.name, albionId: related.guild.albionId }
        : null,
      encounters: row.encounters,
      fame: 0,
    });
    return acc;
  }, []);

  return { allies };
}

export async function getWatchlistActivity(
  entries: {
    players: { region: AlbionRegion; albionId: string }[];
    guilds: { region: AlbionRegion; albionId: string }[];
  },
  limit = 10
) {
  const playerUuids: string[] = [];
  for (const entry of entries.players) {
    const player = await getPlayerByAlbionId(entry.region, entry.albionId);
    if (player) playerUuids.push(player.id);
  }

  const guildRecords = await Promise.all(
    entries.guilds.map((g) => getGuildByAlbionId(g.region, g.albionId))
  );
  const guildNamesLower = guildRecords
    .map((g) => g?.name?.trim().toLowerCase())
    .filter((name): name is string => Boolean(name));

  if (playerUuids.length === 0 && guildNamesLower.length === 0) {
    return [];
  }

  const eventIdScores = new Map<string, Date>();

  if (playerUuids.length > 0) {
    const playerEvents = await db.query.killEvents.findMany({
      where: and(
        killFamePositiveCondition(),
        or(
          inArray(schema.killEvents.killerId, playerUuids),
          inArray(schema.killEvents.victimId, playerUuids)
        )
      ),
      orderBy: [desc(schema.killEvents.occurredAt)],
      limit,
      columns: { id: true, occurredAt: true },
    });
    for (const event of playerEvents) {
      eventIdScores.set(event.id, event.occurredAt);
    }
  }

  if (guildNamesLower.length > 0) {
    const killerPart = alias(schema.killParticipants, "watch_killer");
    const victimPart = alias(schema.killParticipants, "watch_victim");

    for (const nameLower of guildNamesLower) {
      const guildRows = await db
        .select({
          id: schema.killEvents.id,
          occurredAt: schema.killEvents.occurredAt,
        })
        .from(schema.killEvents)
        .innerJoin(
          killerPart,
          and(
            eq(killerPart.eventId, schema.killEvents.id),
            eq(killerPart.role, "killer"),
            sql`lower(trim(${killerPart.guildName})) = ${nameLower}`
          )
        )
        .where(killFamePositiveCondition())
        .orderBy(desc(schema.killEvents.occurredAt))
        .limit(limit);

      for (const row of guildRows) {
        eventIdScores.set(row.id, row.occurredAt);
      }

      const victimRows = await db
        .select({
          id: schema.killEvents.id,
          occurredAt: schema.killEvents.occurredAt,
        })
        .from(schema.killEvents)
        .innerJoin(
          victimPart,
          and(
            eq(victimPart.eventId, schema.killEvents.id),
            eq(victimPart.role, "victim"),
            sql`lower(trim(${victimPart.guildName})) = ${nameLower}`
          )
        )
        .where(killFamePositiveCondition())
        .orderBy(desc(schema.killEvents.occurredAt))
        .limit(limit);

      for (const row of victimRows) {
        eventIdScores.set(row.id, row.occurredAt);
      }
    }
  }

  const sortedIds = [...eventIdScores.entries()]
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .slice(0, limit)
    .map(([id]) => id);

  if (sortedIds.length === 0) return [];

  const events = await db.query.killEvents.findMany({
    where: inArray(schema.killEvents.id, sortedIds),
    with: {
      killer: { with: { guild: true } },
      victim: { with: { guild: true } },
    },
  });

  const byId = new Map(events.map((event) => [event.id, event]));
  return sortedIds
    .map((id) => byId.get(id))
    .filter((event): event is NonNullable<typeof event> => event != null)
    .map(mapKillEventToCard);
}
