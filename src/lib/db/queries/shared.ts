import { eq, gt, gte, inArray, sql } from "drizzle-orm";
import type { AlbionRegion, ContentType } from "@/lib/albion/types";
import { ALL_REGIONS, ENABLED_REGIONS } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";

export type { PlayerBuildItem } from "@/lib/builds/fingerprint";
export {
  buildFingerprint,
  canonicalizeBuildItems,
  extractBuildItemsFromKillItems,
  extractBuildItemsFromParticipantPayload,
  getMainHandItem,
  isSparseBuild,
  preferBuildItems,
  resolveBuildItems,
  type KillItemBuildSource,
} from "@/lib/builds/fingerprint";

/**
 * SQL filter matching `hasKillFame`: positive victim kill fame only.
 * Null/0 fame kills (empty drops / Depths-style) stay out of public lists.
 */
export function killFamePositiveCondition() {
  return gt(schema.killEvents.totalVictimKillFame, 0);
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
