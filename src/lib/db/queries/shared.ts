import { and, eq, gt, gte, inArray, isNull, or, sql } from "drizzle-orm";
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

/**
 * Equipment for sampled participants. Uses kill_items_event_idx, then keeps
 * rows attributed to those participants (new ingest) or killer/victim rows
 * that predate participant_id (legacy).
 */
export async function loadAttributedEquipmentItems(
  eventIds: string[],
  participantIds: string[]
): Promise<Map<string, KillItemBuildSource[]>> {
  if (eventIds.length === 0) return new Map();

  const attribution =
    participantIds.length > 0
      ? or(
          inArray(schema.killItems.participantId, participantIds),
          and(
            isNull(schema.killItems.participantId),
            inArray(schema.killItems.ownerRole, [...UNIQUE_BUILD_OWNER_ROLES])
          )
        )
      : and(
          isNull(schema.killItems.participantId),
          inArray(schema.killItems.ownerRole, [...UNIQUE_BUILD_OWNER_ROLES])
        );

  const rows = await db
    .select({
      eventId: schema.killItems.eventId,
      participantId: schema.killItems.participantId,
      ownerRole: schema.killItems.ownerRole,
      category: schema.killItems.category,
      slot: schema.killItems.slot,
      itemType: schema.killItems.itemType,
      quality: schema.killItems.quality,
    })
    .from(schema.killItems)
    .where(
      and(
        inArray(schema.killItems.eventId, eventIds),
        eq(schema.killItems.category, "equipment"),
        attribution
      )
    );

  const byEvent = new Map<string, KillItemBuildSource[]>();
  for (const row of rows) {
    const list = byEvent.get(row.eventId) ?? [];
    list.push(row);
    byEvent.set(row.eventId, list);
  }
  return byEvent;
}
