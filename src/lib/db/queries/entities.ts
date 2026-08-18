import { and, count, desc, eq, gte, ilike, inArray, isNotNull, ne, or, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { buildPresentation, decorateBuildItem } from "@/lib/items/build-display";
import type { ArmorClass } from "@/lib/items/item-meta";
import type { WeaponRole } from "@/lib/items/weapon-roles";
import { normalizeAllianceInfo, parseAllianceGuilds } from "@/lib/albion/alliance-info";
import type {
  AlbionRegion,
  AlbionAllianceInfo,
  GuildBattleSummary,
  NormalizedAllianceInfo,
} from "@/lib/albion/types";
import { wrapGuildBattleListCache, isGuildBattleCacheComplete } from "@/lib/albion/battles";
import { itemFamilyKey } from "@/lib/item-icons";
import { db, schema } from "@/lib/db";
import { hydrateKillCardsByIds } from "./kills";
import {
  type PlayerBuildItem,
  type PlayerContentMixEntry,
  buildFingerprint,
  canonicalizeBuildItems,
  extractBuildItemsFromParticipantPayload,
  getMainHandItem,
  isSparseBuild,
  killFamePositiveCondition,
  preferBuildItems,
} from "./shared";

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

export interface PlayerTopBuild {
  count: number;
  items: PlayerBuildItem[];
  titleNames: Record<string, string>;
  weaponRole: WeaponRole | null;
  armorClass: ArmorClass | null;
}

export interface PlayerAnalytics {
  activity: PlayerActivityDay[];
  fameByDay: PlayerFameDay[];
  contentMix: PlayerContentMixEntry[];
  topBuilds: PlayerTopBuild[];
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

const EMPTY_PLAYER_ANALYTICS: PlayerAnalytics = {
  activity: [],
  fameByDay: [],
  contentMix: [],
  topBuilds: [],
};

function getLast30DaysCutoff() {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

/** Cap gear-sample rows so active ZvZ players cannot load unbounded JSONB. */
const PLAYER_ANALYTICS_BUILD_SAMPLE_LIMIT = 500;

function toDateKey(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
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
    .map((build) => {
      const items = canonicalizeBuildItems(build.items).map(decorateBuildItem);
      return {
        count: build.count,
        items,
        ...buildPresentation(items),
      };
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

export async function getPlayerByName(region: AlbionRegion, name: string) {
  return db.query.players.findFirst({
    where: and(
      eq(schema.players.region, region),
      eq(schema.players.name, name)
    ),
    with: { guild: true },
  });
}

export async function getPlayerByNameCaseInsensitive(
  region: AlbionRegion,
  name: string
) {
  return db.query.players.findFirst({
    where: and(
      eq(schema.players.region, region),
      ilike(schema.players.name, name)
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

export async function getGuildByName(region: AlbionRegion, name: string) {
  return db.query.guilds.findFirst({
    where: and(
      eq(schema.guilds.region, region),
      eq(schema.guilds.name, name)
    ),
  });
}

export async function getGuildByNameCaseInsensitive(
  region: AlbionRegion,
  name: string
) {
  return db.query.guilds.findFirst({
    where: and(
      eq(schema.guilds.region, region),
      ilike(schema.guilds.name, name)
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
    topBattlesPayload,
    { requireAlliancePreview: true }
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
  const idRows = await db
    .select({ id: schema.killEvents.id })
    .from(schema.killEvents)
    .where(
      and(
        eq(schema.killEvents.killerId, playerUuid),
        killFamePositiveCondition()
      )
    )
    .orderBy(desc(schema.killEvents.occurredAt))
    .limit(limit);

  return hydrateKillCardsByIds(idRows.map((row) => row.id));
}

export async function getPlayerDeathHistoryFromDb(
  playerUuid: string,
  limit = 10
) {
  const idRows = await db
    .select({ id: schema.killEvents.id })
    .from(schema.killEvents)
    .where(
      and(
        eq(schema.killEvents.victimId, playerUuid),
        killFamePositiveCondition()
      )
    )
    .orderBy(desc(schema.killEvents.occurredAt))
    .limit(limit);

  return hydrateKillCardsByIds(idRows.map((row) => row.id));
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
      )
      .orderBy(desc(schema.killEvents.occurredAt))
      .limit(PLAYER_ANALYTICS_BUILD_SAMPLE_LIMIT),
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

  const idRows = await db
    .select({ id: schema.killEvents.id })
    .from(schema.killEvents)
    .where(
      and(
        eq(schema.killEvents.region, region),
        inArray(schema.killEvents.killerId, playerIds),
        killFamePositiveCondition()
      )
    )
    .orderBy(desc(schema.killEvents.totalVictimKillFame))
    .limit(limit);

  return hydrateKillCardsByIds(idRows.map((row) => row.id));
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

  const idRows = await db
    .select({ id: schema.killEvents.id })
    .from(schema.killEvents)
    .where(
      and(
        eq(schema.killEvents.region, region),
        inArray(schema.killEvents.killerId, playerIds),
        killFamePositiveCondition()
      )
    )
    .orderBy(desc(schema.killEvents.totalVictimKillFame))
    .limit(limit);

  return hydrateKillCardsByIds(idRows.map((row) => row.id));
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

  return hydrateKillCardsByIds(ids);
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

export async function getAllianceFeudKillsFromDb(
  region: AlbionRegion,
  allianceIdA: string,
  allianceIdB: string,
  options: { limit?: number; excludeEventId?: number } = {}
) {
  const { limit = 10, excludeEventId } = options;
  const idA = allianceIdA.trim();
  const idB = allianceIdB.trim();
  if (!idA || !idB || idA === idB) return [];

  const rows = await db
    .select({ id: schema.killEvents.id })
    .from(schema.killEvents)
    .where(
      and(
        eq(schema.killEvents.region, region),
        killFamePositiveCondition(),
        excludeEventId != null
          ? ne(schema.killEvents.eventId, excludeEventId)
          : undefined,
        or(
          and(
            sql`${schema.killEvents.rawPayload}->'Killer'->>'AllianceId' = ${idA}`,
            sql`${schema.killEvents.rawPayload}->'Victim'->>'AllianceId' = ${idB}`
          ),
          and(
            sql`${schema.killEvents.rawPayload}->'Killer'->>'AllianceId' = ${idB}`,
            sql`${schema.killEvents.rawPayload}->'Victim'->>'AllianceId' = ${idA}`
          )
        )
      )
    )
    .orderBy(desc(schema.killEvents.occurredAt))
    .limit(limit);

  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return [];

  return hydrateKillCardsByIds(ids);
}

export async function getAllianceFeudStats(
  region: AlbionRegion,
  allianceIdA: string,
  allianceIdB: string
): Promise<GuildFeudStats> {
  const empty: GuildFeudStats = {
    aKillsB: 0,
    bKillsA: 0,
    aFameOnB: 0,
    bFameOnA: 0,
  };

  const idA = allianceIdA.trim();
  const idB = allianceIdB.trim();
  if (!idA || !idB || idA === idB) return empty;

  const [aKillsBRow, bKillsARow] = await Promise.all([
    db
      .select({
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .where(
        and(
          eq(schema.killEvents.region, region),
          killFamePositiveCondition(),
          sql`${schema.killEvents.rawPayload}->'Killer'->>'AllianceId' = ${idA}`,
          sql`${schema.killEvents.rawPayload}->'Victim'->>'AllianceId' = ${idB}`
        )
      ),
    db
      .select({
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .where(
        and(
          eq(schema.killEvents.region, region),
          killFamePositiveCondition(),
          sql`${schema.killEvents.rawPayload}->'Killer'->>'AllianceId' = ${idB}`,
          sql`${schema.killEvents.rawPayload}->'Victim'->>'AllianceId' = ${idA}`
        )
      ),
  ]);

  return {
    aKillsB: aKillsBRow[0]?.count ?? 0,
    bKillsA: bKillsARow[0]?.count ?? 0,
    aFameOnB: Number(aKillsBRow[0]?.fame ?? 0),
    bFameOnA: Number(bKillsARow[0]?.fame ?? 0),
  };
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

export async function resolveWatchlistKillFeed(entries: {
  players?: { region: AlbionRegion; albionId: string }[];
  guilds?: { region: AlbionRegion; albionId: string }[];
  alliances?: { region: AlbionRegion; albionId: string }[];
}): Promise<{
  playerIds: string[];
  guildNamesLower: string[];
  alliances: { region: AlbionRegion; albionId: string }[];
}> {
  const playerIds: string[] = [];
  for (const entry of entries.players ?? []) {
    const player = await getPlayerByAlbionId(entry.region, entry.albionId);
    if (player) playerIds.push(player.id);
  }

  const guildRecords = await Promise.all(
    (entries.guilds ?? []).map((g) => getGuildByAlbionId(g.region, g.albionId))
  );
  const guildNamesLower = guildRecords
    .map((g) => g?.name?.trim().toLowerCase())
    .filter((name): name is string => Boolean(name));

  const alliances = (entries.alliances ?? []).filter(
    (a) => a.albionId.trim().length > 0
  );

  return { playerIds, guildNamesLower, alliances };
}

export async function getWatchlistActivity(
  entries: {
    players: { region: AlbionRegion; albionId: string }[];
    guilds: { region: AlbionRegion; albionId: string }[];
    alliances?: { region: AlbionRegion; albionId: string }[];
  },
  limit = 10
) {
  const resolved = await resolveWatchlistKillFeed(entries);
  const playerUuids = resolved.playerIds;
  const guildNamesLower = resolved.guildNamesLower;
  const alliances = resolved.alliances;

  if (
    playerUuids.length === 0 &&
    guildNamesLower.length === 0 &&
    alliances.length === 0
  ) {
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

  if (alliances.length > 0) {
    for (const alliance of alliances) {
      const allianceRows = await db
        .select({
          id: schema.killEvents.id,
          occurredAt: schema.killEvents.occurredAt,
        })
        .from(schema.killEvents)
        .where(
          and(
            eq(schema.killEvents.region, alliance.region),
            killFamePositiveCondition(),
            or(
              sql`${schema.killEvents.rawPayload}->'Killer'->>'AllianceId' = ${alliance.albionId}`,
              sql`${schema.killEvents.rawPayload}->'Victim'->>'AllianceId' = ${alliance.albionId}`
            )
          )
        )
        .orderBy(desc(schema.killEvents.occurredAt))
        .limit(limit);

      for (const row of allianceRows) {
        eventIdScores.set(row.id, row.occurredAt);
      }
    }
  }

  const sortedIds = [...eventIdScores.entries()]
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .slice(0, limit)
    .map(([id]) => id);

  if (sortedIds.length === 0) return [];

  return hydrateKillCardsByIds(sortedIds);
}
