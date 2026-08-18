import { eq, gt, gte, inArray, sql } from "drizzle-orm";
import type { AlbionPlayerRef, AlbionRegion, ContentType } from "@/lib/albion/types";
import { ALL_REGIONS, ENABLED_REGIONS, TOP_BUILD_SLOTS } from "@/lib/albion/types";
import {
  canonicalizeItemType,
  itemFamilyKey,
  ITEM_QUALITY_EXCELLENT,
  parseItemType,
} from "@/lib/item-icons";
import { schema } from "@/lib/db";

/**
 * SQL filter matching `hasKillFame`: positive victim kill fame only.
 * Null/0 fame kills (empty drops / Depths-style) stay out of public lists.
 */
export function killFamePositiveCondition() {
  return gt(schema.killEvents.totalVictimKillFame, 0);
}

export type ContentTypeFilter = "ZVZ" | "SOLO" | "GROUP" | "all";

export interface PlayerBuildItem {
  slot: string;
  itemType: string;
  quality: number;
  displayNames?: Record<string, string>;
  familyNames?: Record<string, string>;
}

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

export function extractBuildItemsFromParticipantPayload(
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

export function getMainHandItem(
  items: PlayerBuildItem[]
): PlayerBuildItem | undefined {
  return items.find((item) => item.slot === "MainHand");
}

/** Assist/group payloads often only include MainHand. */
export function isSparseBuild(items: PlayerBuildItem[]): boolean {
  return items.length > 0 && items.length < 3;
}

/** Fingerprint by gear family (same item across tiers/enchantments/quality). */
export function buildFingerprint(items: PlayerBuildItem[]): string {
  const bySlot = new Map(items.map((item) => [item.slot, item]));
  return TOP_BUILD_SLOTS.filter((slot) => bySlot.has(slot))
    .map((slot) => `${slot}:${itemFamilyKey(bySlot.get(slot)!.itemType)}`)
    .join("|");
}

/** Display builds as T8 Excellent of each item family. */
export function canonicalizeBuildItems(items: PlayerBuildItem[]): PlayerBuildItem[] {
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

export function preferBuildItems(
  current: PlayerBuildItem[],
  candidate: PlayerBuildItem[]
): PlayerBuildItem[] {
  if (candidate.length > current.length) return candidate;
  if (candidate.length < current.length) return current;
  return buildPowerScore(candidate) > buildPowerScore(current)
    ? candidate
    : current;
}
