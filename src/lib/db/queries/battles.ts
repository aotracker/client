import { cache } from "react";
import { and, count, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import type {
  AlbionBattle,
  AlbionBattleAllianceStats,
  AlbionBattleGuildStats,
  AlbionRegion,
} from "@/lib/albion/types";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";
import {
  BATTLES_FEED_PREVIEW_LIMIT,
  parseBattlesMinPlayers,
  RELATED_BATTLE_WINDOW_MS,
  RECENT_BATTLES_MIN_PLAYERS,
} from "@/lib/battles-constants";
import { scoreRelatedBattles } from "@/lib/battles/related";

export interface BattlesFeedFilters {
  region?: AlbionRegion | "all";
  /** Case-insensitive name match against guilds, alliances, or players in battle payloads. */
  q?: string;
  /** Inclusive player floor; values below RECENT_BATTLES_MIN_PLAYERS are clamped. */
  minPlayers?: number;
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
  q?: string,
  minPlayers?: number
) {
  const playerFloor = parseBattlesMinPlayers(
    minPlayers != null ? String(minPlayers) : undefined
  );
  const conditions = [
    battlesRegionCondition(region),
    isNotNull(schema.battles.totalFame),
    isNotNull(schema.battles.totalKills),
    isNotNull(schema.battles.totalPlayers),
    gte(schema.battles.totalPlayers, playerFloor),
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
  const { region = "all", q, minPlayers, limit = 20, offset = 0 } = filters;
  const where = battlesFeedWhere(region, q, minPlayers);

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
  filters: Pick<BattlesFeedFilters, "region" | "q" | "minPlayers"> = {}
): Promise<number> {
  const { region = "all", q, minPlayers } = filters;
  const where = battlesFeedWhere(region, q, minPlayers);
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
    gte(schema.battles.totalPlayers, RECENT_BATTLES_MIN_PLAYERS),
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
