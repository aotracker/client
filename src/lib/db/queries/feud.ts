import { and, count, desc, eq, gte, inArray, isNotNull, sql, sum, type SQL } from "drizzle-orm";
import type { AlbionRegion } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";
import type { FeudDaysFilter } from "@/lib/feud/params";
import { feudDaysCutoff } from "@/lib/feud/params";
import { parseBattlesFeedPreview } from "@/lib/db/battle-cache";
import {
  allianceFeudAKillsBCondition,
  allianceFeudBKillsACondition,
  allianceFeudPairCondition,
  guildFeudAKillsBCondition,
  guildFeudBKillsACondition,
  guildFeudPairCondition,
  type GuildFeudInput,
} from "./feud-conditions";
import { hydrateKillCardsByIds } from "./kills";
import type { BattlesFeedItem } from "./battles";
import {
  killFamePositiveCondition,
  loadPlayersWithGuildNames,
  type PlayerContentMixEntry,
} from "./shared";

export interface FeudStats {
  aKillsB: number;
  bKillsA: number;
  aFameOnB: number;
  bFameOnA: number;
}

export interface FeudPlayerEntry {
  playerId: string;
  albionId: string;
  name: string;
  guildName?: string | null;
  guildAlbionId?: string | null;
  kills: number;
  fame: number;
}

export interface FeudSharedBattle {
  battle: BattlesFeedItem;
  feudKillCount: number;
  aKills: number;
  bKills: number;
}

export interface FeudKillsPage {
  kills: Awaited<ReturnType<typeof hydrateKillCardsByIds>>;
  total: number;
  hasMore: boolean;
}

function feudTimeCondition(cutoff: Date) {
  return gte(schema.killEvents.occurredAt, cutoff);
}

function feudBaseConditions(
  region: AlbionRegion,
  pairCondition: SQL,
  days: FeudDaysFilter
) {
  return and(
    eq(schema.killEvents.region, region),
    killFamePositiveCondition(),
    pairCondition,
    feudTimeCondition(feudDaysCutoff(days))
  );
}

function guildFeudInput(
  guildNameA: string,
  guildNameB: string,
  guildAId?: string | null,
  guildBId?: string | null
): GuildFeudInput {
  return {
    guildNameA,
    guildNameB,
    guildAId,
    guildBId,
  };
}

export type FeudScope =
  | {
      kind: "guild";
      nameA: string;
      nameB: string;
      guildAId?: string | null;
      guildBId?: string | null;
    }
  | { kind: "alliance"; idA: string; idB: string };

function feudConditions(scope: FeudScope) {
  if (scope.kind === "guild") {
    const input = guildFeudInput(
      scope.nameA,
      scope.nameB,
      scope.guildAId,
      scope.guildBId
    );
    return {
      pair: guildFeudPairCondition(input),
      aKillsB: guildFeudAKillsBCondition(input),
      bKillsA: guildFeudBKillsACondition(input),
    };
  }
  const idA = scope.idA.trim();
  const idB = scope.idB.trim();
  return {
    pair: allianceFeudPairCondition(idA, idB),
    aKillsB: allianceFeudAKillsBCondition(idA, idB),
    bKillsA: allianceFeudBKillsACondition(idA, idB),
  };
}

function guildFeudScope(
  guildNameA: string,
  guildNameB: string,
  options: { guildAId?: string | null; guildBId?: string | null } = {}
): FeudScope {
  return {
    kind: "guild",
    nameA: guildNameA,
    nameB: guildNameB,
    guildAId: options.guildAId,
    guildBId: options.guildBId,
  };
}

async function loadFeudStats(
  region: AlbionRegion,
  aKillsBCond: SQL | null,
  bKillsACond: SQL | null,
  days: FeudDaysFilter
): Promise<FeudStats> {
  const empty: FeudStats = {
    aKillsB: 0,
    bKillsA: 0,
    aFameOnB: 0,
    bFameOnA: 0,
  };
  if (!aKillsBCond || !bKillsACond) return empty;

  const cutoff = feudDaysCutoff(days);
  const timeCond = feudTimeCondition(cutoff);

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
          aKillsBCond,
          timeCond
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
          bKillsACond,
          timeCond
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

export async function getGuildFeudPageStats(
  region: AlbionRegion,
  guildNameA: string,
  guildNameB: string,
  options: {
    days?: FeudDaysFilter;
    guildAId?: string | null;
    guildBId?: string | null;
  } = {}
): Promise<FeudStats> {
  const { aKillsB, bKillsA } = feudConditions(
    guildFeudScope(guildNameA, guildNameB, options)
  );
  return loadFeudStats(region, aKillsB, bKillsA, options.days ?? 7);
}

export async function getAllianceFeudPageStats(
  region: AlbionRegion,
  allianceIdA: string,
  allianceIdB: string,
  days: FeudDaysFilter = 7
): Promise<FeudStats> {
  const { aKillsB, bKillsA } = feudConditions({
    kind: "alliance",
    idA: allianceIdA,
    idB: allianceIdB,
  });
  return loadFeudStats(region, aKillsB, bKillsA, days);
}

async function loadFeudContentMix(
  region: AlbionRegion,
  pairCondition: SQL | null,
  days: FeudDaysFilter
): Promise<PlayerContentMixEntry[]> {
  if (!pairCondition) return [];

  const rows = await db
    .select({
      contentType: schema.killEvents.contentType,
      count: count(),
    })
    .from(schema.killEvents)
    .where(feudBaseConditions(region, pairCondition, days))
    .groupBy(schema.killEvents.contentType);

  return rows.map((row) => ({
    contentType: row.contentType,
    count: row.count,
  }));
}

export async function getGuildFeudContentMix(
  region: AlbionRegion,
  guildNameA: string,
  guildNameB: string,
  options: {
    days?: FeudDaysFilter;
    guildAId?: string | null;
    guildBId?: string | null;
  } = {}
) {
  const { pair } = feudConditions(
    guildFeudScope(guildNameA, guildNameB, options)
  );
  return loadFeudContentMix(region, pair, options.days ?? 7);
}

export async function getAllianceFeudContentMix(
  region: AlbionRegion,
  allianceIdA: string,
  allianceIdB: string,
  days: FeudDaysFilter = 7
) {
  const { pair } = feudConditions({
    kind: "alliance",
    idA: allianceIdA,
    idB: allianceIdB,
  });
  return loadFeudContentMix(region, pair, days);
}

async function loadFeudTopKills(
  region: AlbionRegion,
  pairCondition: SQL | null,
  days: FeudDaysFilter,
  limit: number
) {
  if (!pairCondition) return [];

  const rows = await db
    .select({ id: schema.killEvents.id })
    .from(schema.killEvents)
    .where(feudBaseConditions(region, pairCondition, days))
    .orderBy(desc(schema.killEvents.totalVictimKillFame))
    .limit(limit);

  return hydrateKillCardsByIds(rows.map((row) => row.id));
}

export async function getGuildFeudTopKills(
  region: AlbionRegion,
  guildNameA: string,
  guildNameB: string,
  options: {
    days?: FeudDaysFilter;
    limit?: number;
    guildAId?: string | null;
    guildBId?: string | null;
  } = {}
) {
  const { pair } = feudConditions(
    guildFeudScope(guildNameA, guildNameB, options)
  );
  return loadFeudTopKills(
    region,
    pair,
    options.days ?? 7,
    options.limit ?? 10
  );
}

export async function getAllianceFeudTopKills(
  region: AlbionRegion,
  allianceIdA: string,
  allianceIdB: string,
  options: { days?: FeudDaysFilter; limit?: number } = {}
) {
  const { pair } = feudConditions({
    kind: "alliance",
    idA: allianceIdA,
    idB: allianceIdB,
  });
  return loadFeudTopKills(
    region,
    pair,
    options.days ?? 7,
    options.limit ?? 10
  );
}

async function loadFeudPlayerRows(
  region: AlbionRegion,
  directionCondition: SQL,
  playerColumn: typeof schema.killEvents.killerId | typeof schema.killEvents.victimId,
  days: FeudDaysFilter,
  limit: number
) {
  const cutoff = feudDaysCutoff(days);
  const rows = await db
    .select({
      playerId: playerColumn,
      kills: count(),
      fame: sum(schema.killEvents.totalVictimKillFame),
    })
    .from(schema.killEvents)
    .where(
      and(
        eq(schema.killEvents.region, region),
        killFamePositiveCondition(),
        directionCondition,
        isNotNull(playerColumn),
        feudTimeCondition(cutoff)
      )
    )
    .groupBy(playerColumn)
    .orderBy(desc(count()))
    .limit(limit);

  const playerIds = rows
    .map((row) => row.playerId)
    .filter((id): id is string => Boolean(id));
  if (playerIds.length === 0) return [];

  const players = await loadPlayersWithGuildNames(playerIds);
  const playerById = new Map(players.map((player) => [player.id, player]));

  return rows.reduce<FeudPlayerEntry[]>((acc, row) => {
    if (!row.playerId) return acc;
    const player = playerById.get(row.playerId);
    if (!player) return acc;
    acc.push({
      playerId: player.id,
      albionId: player.albionId,
      name: player.name,
      guildName: player.guild?.name ?? null,
      guildAlbionId: player.guild?.albionId ?? null,
      kills: row.kills,
      fame: Number(row.fame ?? 0),
    });
    return acc;
  }, []);
}

export interface FeudTopPlayers {
  aKillers: FeudPlayerEntry[];
  bKillers: FeudPlayerEntry[];
  aVictims: FeudPlayerEntry[];
  bVictims: FeudPlayerEntry[];
}

async function loadFeudTopPlayers(
  region: AlbionRegion,
  aKillsBCond: SQL | null,
  bKillsACond: SQL | null,
  days: FeudDaysFilter,
  limit: number
): Promise<FeudTopPlayers> {
  const empty: FeudTopPlayers = {
    aKillers: [],
    bKillers: [],
    aVictims: [],
    bVictims: [],
  };
  if (!aKillsBCond || !bKillsACond) return empty;

  const [aKillers, bKillers, aVictims, bVictims] = await Promise.all([
    loadFeudPlayerRows(
      region,
      aKillsBCond,
      schema.killEvents.killerId,
      days,
      limit
    ),
    loadFeudPlayerRows(
      region,
      bKillsACond,
      schema.killEvents.killerId,
      days,
      limit
    ),
    loadFeudPlayerRows(
      region,
      bKillsACond,
      schema.killEvents.victimId,
      days,
      limit
    ),
    loadFeudPlayerRows(
      region,
      aKillsBCond,
      schema.killEvents.victimId,
      days,
      limit
    ),
  ]);

  return { aKillers, bKillers, aVictims, bVictims };
}

export async function getGuildFeudTopPlayers(
  region: AlbionRegion,
  guildNameA: string,
  guildNameB: string,
  options: {
    days?: FeudDaysFilter;
    limit?: number;
    guildAId?: string | null;
    guildBId?: string | null;
  } = {}
): Promise<FeudTopPlayers> {
  const { aKillsB, bKillsA } = feudConditions(
    guildFeudScope(guildNameA, guildNameB, options)
  );
  return loadFeudTopPlayers(
    region,
    aKillsB,
    bKillsA,
    options.days ?? 7,
    options.limit ?? 5
  );
}

export async function getAllianceFeudTopPlayers(
  region: AlbionRegion,
  allianceIdA: string,
  allianceIdB: string,
  options: { days?: FeudDaysFilter; limit?: number } = {}
): Promise<FeudTopPlayers> {
  const { aKillsB, bKillsA } = feudConditions({
    kind: "alliance",
    idA: allianceIdA,
    idB: allianceIdB,
  });
  return loadFeudTopPlayers(
    region,
    aKillsB,
    bKillsA,
    options.days ?? 7,
    options.limit ?? 5
  );
}

function mapBattleFeedRow(row: {
  id: number;
  region: AlbionRegion;
  startTime: Date | null;
  totalFame: number | null;
  totalKills: number | null;
  totalPlayers: number | null;
  feedPreview: unknown;
}): BattlesFeedItem {
  return {
    id: row.id,
    region: row.region,
    startTime: row.startTime ? row.startTime.toISOString() : null,
    totalFame: row.totalFame,
    totalKills: row.totalKills,
    totalPlayers: row.totalPlayers,
    ...parseBattlesFeedPreview(row.feedPreview),
  };
}

async function loadFeudSharedBattles(
  region: AlbionRegion,
  pairCondition: SQL | null,
  aKillsBCond: SQL | null,
  bKillsACond: SQL | null,
  days: FeudDaysFilter,
  limit: number
): Promise<FeudSharedBattle[]> {
  if (!pairCondition || !aKillsBCond || !bKillsACond) return [];

  const battleRows = await db
    .select({
      albionBattleId: schema.killEvents.albionBattleId,
      feudKillCount: count(),
      aKills: sql<number>`count(*) filter (where ${aKillsBCond})`.mapWith(Number),
      bKills: sql<number>`count(*) filter (where ${bKillsACond})`.mapWith(Number),
      lastAt: sql<Date>`max(${schema.killEvents.occurredAt})`,
    })
    .from(schema.killEvents)
    .where(
      and(
        feudBaseConditions(region, pairCondition, days),
        isNotNull(schema.killEvents.albionBattleId)
      )
    )
    .groupBy(schema.killEvents.albionBattleId)
    .orderBy(desc(sql`max(${schema.killEvents.occurredAt})`))
    .limit(limit);

  const battleIds = battleRows
    .map((row) => row.albionBattleId)
    .filter((id): id is number => id != null);
  if (battleIds.length === 0) return [];

  const battles = await db
    .select({
      id: schema.battles.albionBattleId,
      region: schema.battles.region,
      startTime: schema.battles.startTime,
      totalFame: schema.battles.totalFame,
      totalKills: schema.battles.totalKills,
      totalPlayers: schema.battles.totalPlayers,
      feedPreview: schema.battles.feedPreview,
    })
    .from(schema.battles)
    .where(
      and(
        eq(schema.battles.region, region),
        inArray(schema.battles.albionBattleId, battleIds)
      )
    );

  const battleById = new Map(battles.map((row) => [row.id, row]));

  return battleRows.reduce<FeudSharedBattle[]>((acc, row) => {
    if (row.albionBattleId == null) return acc;
    const battleRow = battleById.get(row.albionBattleId);
    if (!battleRow) return acc;
    acc.push({
      battle: mapBattleFeedRow(battleRow),
      feudKillCount: row.feudKillCount,
      aKills: row.aKills,
      bKills: row.bKills,
    });
    return acc;
  }, []);
}

export async function getGuildFeudSharedBattles(
  region: AlbionRegion,
  guildNameA: string,
  guildNameB: string,
  options: {
    days?: FeudDaysFilter;
    limit?: number;
    guildAId?: string | null;
    guildBId?: string | null;
  } = {}
) {
  const { pair, aKillsB, bKillsA } = feudConditions(
    guildFeudScope(guildNameA, guildNameB, options)
  );
  return loadFeudSharedBattles(
    region,
    pair,
    aKillsB,
    bKillsA,
    options.days ?? 7,
    options.limit ?? 10
  );
}

export async function getAllianceFeudSharedBattles(
  region: AlbionRegion,
  allianceIdA: string,
  allianceIdB: string,
  options: { days?: FeudDaysFilter; limit?: number } = {}
) {
  const { pair, aKillsB, bKillsA } = feudConditions({
    kind: "alliance",
    idA: allianceIdA,
    idB: allianceIdB,
  });
  return loadFeudSharedBattles(
    region,
    pair,
    aKillsB,
    bKillsA,
    options.days ?? 7,
    options.limit ?? 10
  );
}

async function loadFeudKillsPage(
  region: AlbionRegion,
  pairCondition: SQL | null,
  days: FeudDaysFilter,
  pageSize: number,
  cumulativeOffset: number
): Promise<FeudKillsPage> {
  if (!pairCondition) {
    return { kills: [], total: 0, hasMore: false };
  }

  const where = feudBaseConditions(region, pairCondition, days);
  const displayLimit = cumulativeOffset + pageSize;

  const [countRow, idRows] = await Promise.all([
    db.select({ total: count() }).from(schema.killEvents).where(where),
    db
      .select({ id: schema.killEvents.id })
      .from(schema.killEvents)
      .where(where)
      .orderBy(desc(schema.killEvents.occurredAt))
      .limit(displayLimit + 1),
  ]);

  const total = countRow[0]?.total ?? 0;
  const hasMore = idRows.length > displayLimit;
  const pageIds = idRows.slice(0, displayLimit).map((row) => row.id);
  const kills = await hydrateKillCardsByIds(pageIds);

  return { kills, total, hasMore };
}

export async function getGuildFeudKillsPage(
  region: AlbionRegion,
  guildNameA: string,
  guildNameB: string,
  options: {
    days?: FeudDaysFilter;
    limit?: number;
    offset?: number;
    guildAId?: string | null;
    guildBId?: string | null;
  } = {}
): Promise<FeudKillsPage> {
  const { pair } = feudConditions(
    guildFeudScope(guildNameA, guildNameB, options)
  );
  return loadFeudKillsPage(
    region,
    pair,
    options.days ?? 7,
    options.limit ?? 25,
    options.offset ?? 0
  );
}

export async function getAllianceFeudKillsPage(
  region: AlbionRegion,
  allianceIdA: string,
  allianceIdB: string,
  options: {
    days?: FeudDaysFilter;
    limit?: number;
    offset?: number;
  } = {}
): Promise<FeudKillsPage> {
  const { pair } = feudConditions({
    kind: "alliance",
    idA: allianceIdA,
    idB: allianceIdB,
  });
  return loadFeudKillsPage(
    region,
    pair,
    options.days ?? 7,
    options.limit ?? 25,
    options.offset ?? 0
  );
}

export interface FeudGuildPairEntry {
  guildAId: string | null;
  guildAName: string;
  guildBId: string | null;
  guildBName: string;
  killCount: number;
  fame: number;
}

function guildPairFromAllianceFeudKill(
  row: {
    killerAllianceAlbionId: string | null;
    victimAllianceAlbionId: string | null;
    killerGuildAlbionId: string | null;
    killerGuildName: string | null;
    victimGuildAlbionId: string | null;
    victimGuildName: string | null;
  },
  allianceIdA: string
): Omit<FeudGuildPairEntry, "killCount" | "fame"> | null {
  const idA = allianceIdA.trim();
  const killerIsA = row.killerAllianceAlbionId?.trim() === idA;

  const guildAId = killerIsA
    ? row.killerGuildAlbionId
    : row.victimGuildAlbionId;
  const guildAName = killerIsA
    ? row.killerGuildName
    : row.victimGuildName;
  const guildBId = killerIsA
    ? row.victimGuildAlbionId
    : row.killerGuildAlbionId;
  const guildBName = killerIsA
    ? row.victimGuildName
    : row.killerGuildName;

  const aName = guildAName?.trim() ?? "";
  const bName = guildBName?.trim() ?? "";
  if (!aName || !bName) return null;

  return {
    guildAId: guildAId?.trim() || null,
    guildAName: aName,
    guildBId: guildBId?.trim() || null,
    guildBName: bName,
  };
}

export async function getAllianceFeudGuildPairs(
  region: AlbionRegion,
  allianceIdA: string,
  allianceIdB: string,
  options: { days?: FeudDaysFilter; limit?: number } = {}
): Promise<FeudGuildPairEntry[]> {
  const idA = allianceIdA.trim();
  const idB = allianceIdB.trim();
  const pairCondition = allianceFeudPairCondition(idA, idB);
  if (!pairCondition) return [];

  const rows = await db
    .select({
      killerAllianceAlbionId: schema.killEvents.killerAllianceAlbionId,
      victimAllianceAlbionId: schema.killEvents.victimAllianceAlbionId,
      killerGuildAlbionId: schema.killEvents.killerGuildAlbionId,
      killerGuildName: schema.killEvents.killerGuildName,
      victimGuildAlbionId: schema.killEvents.victimGuildAlbionId,
      victimGuildName: schema.killEvents.victimGuildName,
      fame: schema.killEvents.totalVictimKillFame,
    })
    .from(schema.killEvents)
    .where(feudBaseConditions(region, pairCondition, options.days ?? 7));

  const merged = new Map<string, FeudGuildPairEntry>();

  for (const row of rows) {
    const pair = guildPairFromAllianceFeudKill(row, idA);
    if (!pair) continue;

    const key = `${pair.guildAName.toLowerCase()}|${pair.guildBName.toLowerCase()}`;
    const existing = merged.get(key) ?? {
      ...pair,
      killCount: 0,
      fame: 0,
    };
    existing.killCount += 1;
    existing.fame += Number(row.fame ?? 0);
    merged.set(key, existing);
  }

  return Array.from(merged.values())
    .sort((a, b) => b.killCount - a.killCount || b.fame - a.fame)
    .slice(0, options.limit ?? 8);
}
