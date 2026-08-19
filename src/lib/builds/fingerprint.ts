import type { AlbionPlayerRef } from "@/lib/albion/types";
import { TOP_BUILD_SLOTS } from "@/lib/albion/types";
import {
  canonicalizeItemType,
  itemFamilyKey,
  ITEM_QUALITY_EXCELLENT,
  parseItemType,
} from "@/lib/item-icons";

export interface PlayerBuildItem {
  slot: string;
  itemType: string;
  quality: number;
  displayNames?: Record<string, string>;
  familyNames?: Record<string, string>;
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
