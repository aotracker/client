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

export interface KillItemBuildSource {
  ownerRole: string;
  category: string;
  slot: string | null;
  itemType: string;
  quality: number | null;
  participantId?: string | null;
}

const TOP_BUILD_SLOT_ORDER = new Map<string, number>(
  TOP_BUILD_SLOTS.map((slot, index) => [slot, index])
);

/**
 * Killer and victim are unique per event even without participant_id.
 * Assist roles are only attributable when kill_items.participant_id is set.
 */
export const UNIQUE_BUILD_OWNER_ROLES = ["killer", "victim"] as const;
export const BUILD_PARTICIPATION_ROLES = [
  "killer",
  "victim",
  "group_member",
  "participant",
] as const;

const BUILD_OWNER_ROLE_PRIORITY: Record<string, number> = {
  killer: 0,
  victim: 1,
  group_member: 2,
  participant: 3,
};

export function isUniqueBuildOwnerRole(
  role: string
): role is (typeof UNIQUE_BUILD_OWNER_ROLES)[number] {
  return role === "killer" || role === "victim";
}

/** True when `candidate` is a better build source than `current` for one event. */
export function isPreferredBuildOwnerRole(
  current: string,
  candidate: string
): boolean {
  return (
    (BUILD_OWNER_ROLE_PRIORITY[candidate] ?? 99) <
    (BUILD_OWNER_ROLE_PRIORITY[current] ?? 99)
  );
}

function sortBuildItems(items: PlayerBuildItem[]): PlayerBuildItem[] {
  return [...items].sort(
    (a, b) =>
      (TOP_BUILD_SLOT_ORDER.get(a.slot) ?? 99) -
      (TOP_BUILD_SLOT_ORDER.get(b.slot) ?? 99)
  );
}

export function extractBuildItemsFromKillItems(
  items: KillItemBuildSource[],
  role: string
): PlayerBuildItem[] {
  const bySlot = new Map<string, PlayerBuildItem>();
  for (const item of items) {
    if (item.ownerRole !== role) continue;
    if (item.category !== "equipment") continue;
    if (!item.slot || !TOP_BUILD_SLOT_ORDER.has(item.slot)) continue;
    if (!item.itemType) continue;
    const next: PlayerBuildItem = {
      slot: item.slot,
      itemType: item.itemType,
      quality: item.quality ?? 0,
    };
    const existing = bySlot.get(item.slot);
    if (!existing) {
      bySlot.set(item.slot, next);
      continue;
    }
    // Duplicate slots mean this role is not uniquely attributable.
    return [];
  }
  return sortBuildItems([...bySlot.values()]);
}

/**
 * Prefer kill_items that belong to this participant. Killer/victim rows remain
 * usable on older events where participant_id is still null. Shared assist
 * roles without participant_id fall back to per-player payload (usually null).
 */
export function resolveBuildItems(
  killItems: KillItemBuildSource[] | undefined,
  role: string,
  rawPayload: unknown,
  participantId?: string | null
): PlayerBuildItem[] {
  const fromItems = extractAttributedBuildItems(
    killItems,
    role,
    participantId
  );
  if (fromItems.length > 0) return fromItems;
  return extractBuildItemsFromParticipantPayload(rawPayload);
}

function extractAttributedBuildItems(
  killItems: KillItemBuildSource[] | undefined,
  role: string,
  participantId?: string | null
): PlayerBuildItem[] {
  if (!killItems?.length) return [];

  if (participantId) {
    const forParticipant = killItems.filter(
      (item) => item.participantId === participantId
    );
    if (forParticipant.length > 0) {
      return extractBuildItemsFromKillItems(forParticipant, role);
    }
  }

  if (isUniqueBuildOwnerRole(role)) {
    return extractBuildItemsFromKillItems(killItems, role);
  }
  return [];
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
