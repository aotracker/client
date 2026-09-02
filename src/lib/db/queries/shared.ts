import { eq, gt, gte, inArray, sql } from "drizzle-orm";
import type { AlbionRegion, ContentType } from "@/lib/albion/types";
import { ALL_REGIONS, ENABLED_REGIONS } from "@/lib/albion/types";
import {
  UNIQUE_BUILD_OWNER_ROLES,
  type KillItemBuildSource,
} from "@/lib/builds/fingerprint";
import { db, schema } from "@/lib/db";
import { JUICY_MIN_SILVER } from "@/lib/kills-feed-params";
import { UI_LOOKBACK_DAYS } from "@/lib/db/retention";

export type { PlayerBuildItem } from "@/lib/builds/fingerprint";
export {
  BUILD_PARTICIPATION_ROLES,
  buildFingerprint,
  canonicalizeBuildItems,
  extractBuildItemsFromKillItems,
  extractBuildItemsFromParticipantPayload,
  getMainHandItem,
  isPreferredBuildOwnerRole,
  isSparseBuild,
  isUniqueBuildOwnerRole,
  preferBuildItems,
  resolveBuildItems,
  UNIQUE_BUILD_OWNER_ROLES,
  type KillItemBuildSource,
} from "@/lib/builds/fingerprint";

/**
 * SQL filter matching `hasKillFame`: positive victim kill fame only.
 * Null/0 fame kills (empty drops / orange-zone empty-bag) stay out of public lists.
 */
export function killFamePositiveCondition() {
  return gt(schema.killEvents.totalVictimKillFame, 0);
}

/** Orange PvP (inventory-only) stays off public kill feeds. */
export function notOrangeZoneCondition() {
  return eq(schema.killEvents.isOrangeZone, false);
}

/** Victim inventory estimated silver ≥ 20m. */
export function juicyLootCondition() {
  return gte(schema.killEvents.lootEstSilver, JUICY_MIN_SILVER);
}

export type ContentTypeFilter = "ZVZ" | "SOLO" | "GROUP" | "all";

export interface PlayerContentMixEntry {
  contentType: ContentType;
  count: number;
}

export interface RegionFilters {
  region?: AlbionRegion | "all";
  limit?: number;
}

export interface TopKillerFilters extends RegionFilters {
  /** Lookback window in days. Defaults to 7. */
  days?: number;
  contentType?: ContentTypeFilter;
}

export interface LeaderboardFilters extends TopKillerFilters {
  limit?: number;
  /** UTC hour 0–23. When set, guilds tab ranks by unique members in that hour. */
  utcHour?: number;
}

export function regionCondition(region: AlbionRegion | "all") {
  if (region !== "all") {
    return eq(schema.killEvents.region, region);
  }
  if (ENABLED_REGIONS.length === 0) {
    return sql`false`;
  }
  return inArray(schema.killEvents.region, ENABLED_REGIONS);
}

/**
 * Same as `regionCondition`, but omits a redundant `region IN (...)` when every
 * Albion region is enabled so time/fame covering indexes stay usable.
 */
export function coveringRegionCondition(region: AlbionRegion | "all") {
  if (region !== "all") {
    return eq(schema.killEvents.region, region);
  }
  if (ENABLED_REGIONS.length === 0) {
    return sql`false`;
  }
  if (ENABLED_REGIONS.length < ALL_REGIONS.length) {
    return inArray(schema.killEvents.region, ENABLED_REGIONS);
  }
  return undefined;
}

export function leaderboardConditions(
  filters: LeaderboardFilters,
  cutoff: Date
) {
  const { region = "all", contentType = "all" } = filters;
  const conditions = [
    killFamePositiveCondition(),
    gte(schema.killEvents.occurredAt, cutoff),
  ];
  const regionFilter = coveringRegionCondition(region);
  if (regionFilter) conditions.push(regionFilter);
  if (contentType !== "all") {
    conditions.push(eq(schema.killEvents.contentType, contentType));
  }
  return conditions;
}

/** UTC calendar date `days` ago (`YYYY-MM-DD`), clamped to the UI lookback. */
export function lookbackUtcDate(days: number, now = new Date()): string {
  const clamped = Math.min(Math.max(Math.floor(days) || 7, 1), UI_LOOKBACK_DAYS);
  return new Date(now.getTime() - clamped * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function playerDayStatsConditions(filters: LeaderboardFilters) {
  const { region = "all", contentType = "all", days = 7 } = filters;
  const conditions = [
    gte(schema.playerDayStats.utcDate, lookbackUtcDate(days)),
  ];
  if (region !== "all") {
    conditions.push(eq(schema.playerDayStats.region, region));
  } else if (ENABLED_REGIONS.length === 0) {
    conditions.push(sql`false`);
  } else if (ENABLED_REGIONS.length < ALL_REGIONS.length) {
    conditions.push(inArray(schema.playerDayStats.region, ENABLED_REGIONS));
  }
  if (contentType !== "all") {
    conditions.push(eq(schema.playerDayStats.contentType, contentType));
  }
  return conditions;
}

/** Player + guild names only — never lifetime_stats or guild battle JSON. */
export async function loadPlayersWithGuildNames(playerIds: string[]) {
  if (playerIds.length === 0) return [];
  return db.query.players.findMany({
    where: inArray(schema.players.id, playerIds),
    columns: {
      id: true,
      albionId: true,
      name: true,
      region: true,
    },
    with: {
      guild: {
        columns: { albionId: true, name: true },
      },
    },
  });
}

function sqlUuidArray(ids: string[]) {
  return sql`ARRAY[${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `
  )}]`;
}

/**
 * Equipment for sampled participants.
 *
 * Postgres flattens a plain join / LATERAL into a hash join that seq-scans
 * ~160M `kill_items` rows (~40s). `OFFSET 0` is an optimization fence so the
 * LATERAL stays correlated; `SET LOCAL` disables hash/merge so the only legal
 * plan is a nested loop into `kill_items_event_idx`.
 */
export async function loadAttributedEquipmentItems(
  eventIds: string[],
  participantIds: string[]
): Promise<Map<string, KillItemBuildSource[]>> {
  if (eventIds.length === 0) return new Map();

  const uniqueEventIds = [...new Set(eventIds)];
  const uniqueParticipantIds = [
    ...new Set(participantIds.filter((id) => id.length > 0)),
  ];

  const uniqueOwnerRolesSql = sql.join(
    UNIQUE_BUILD_OWNER_ROLES.map((role) => sql`${role}`),
    sql`, `
  );
  const attribution =
    uniqueParticipantIds.length > 0
      ? sql`(inner_ki.participant_id = ANY(${sqlUuidArray(uniqueParticipantIds)}) OR (inner_ki.participant_id IS NULL AND inner_ki.owner_role IN (${uniqueOwnerRolesSql})))`
      : sql`(inner_ki.participant_id IS NULL AND inner_ki.owner_role IN (${uniqueOwnerRolesSql}))`;

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL enable_hashjoin = off`);
    await tx.execute(sql`SET LOCAL enable_mergejoin = off`);
    return tx.execute(sql`
      SELECT
        ki.event_id,
        ki.participant_id,
        ki.owner_role,
        ki.category,
        ki.slot,
        ki.item_type,
        ki.quality
      FROM unnest(${sqlUuidArray(uniqueEventIds)}) AS ev(event_id)
      CROSS JOIN LATERAL (
        SELECT
          inner_ki.event_id,
          inner_ki.participant_id,
          inner_ki.owner_role,
          inner_ki.category,
          inner_ki.slot,
          inner_ki.item_type,
          inner_ki.quality
        FROM kill_items AS inner_ki
        WHERE inner_ki.event_id = ev.event_id
          AND inner_ki.category = 'equipment'
          AND ${attribution}
        OFFSET 0
      ) AS ki
    `);
  });

  const byEvent = new Map<string, KillItemBuildSource[]>();
  for (const row of result) {
    const eventId = String(row.event_id);
    const list = byEvent.get(eventId) ?? [];
    list.push({
      ownerRole: String(row.owner_role),
      category: String(row.category),
      slot: (row.slot as string | null) ?? null,
      itemType: String(row.item_type),
      quality: (row.quality as number | null) ?? null,
      participantId: (row.participant_id as string | null) ?? null,
    });
    byEvent.set(eventId, list);
  }
  return byEvent;
}
