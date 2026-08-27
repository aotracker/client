import { classifyContentType } from "./classify";
import {
  type AlbionEvent,
  type AlbionPlayerRef,
  type AlbionRegion,
  type EquipmentSlot,
} from "./types";

/**
 * Full loadout slots for kill cards / profile activity.
 * Primary combat gear first; mount/bag/consumables shown on a second row.
 */
export const KILL_CARD_PRIMARY_SLOTS = [
  "MainHand",
  "OffHand",
  "Head",
  "Armor",
  "Shoes",
  "Cape",
] as const satisfies readonly EquipmentSlot[];

export const KILL_CARD_SECONDARY_SLOTS = [
  "Mount",
  "Bag",
  "Food",
  "Potion",
] as const satisfies readonly EquipmentSlot[];

export const KILL_CARD_BUILD_SLOTS = [
  ...KILL_CARD_PRIMARY_SLOTS,
  ...KILL_CARD_SECONDARY_SLOTS,
] as const satisfies readonly EquipmentSlot[];

export type KillCardBuildSlot = (typeof KILL_CARD_BUILD_SLOTS)[number];

export interface KillCardEvent {
  eventId: number;
  region: string;
  occurredAt: Date;
  contentType: string;
  totalVictimKillFame: number | null;
  /** Albion `numberOfParticipants` (usually includes the killer). */
  participantCount?: number | null;
  /** Victim inventory estimated silver at ingest. */
  lootEstSilver?: number | null;
  /** Victim equipped-gear estimated silver at ingest. */
  gearEstSilver?: number | null;
  killer?: {
    albionId: string;
    name: string;
    guild?: { name: string; albionId?: string } | null;
    /** Alliance tag at time of kill from event payload; omit when none. */
    allianceTag?: string | null;
  } | null;
  victim?: {
    albionId: string;
    name: string;
    guild?: { name: string; albionId?: string } | null;
    /** Alliance tag at time of kill from event payload; omit when none. */
    allianceTag?: string | null;
  } | null;
  items?: {
    ownerRole: string;
    slot: string | null;
    itemType: string;
    quality: number | null;
    category: string;
    count?: number | null;
    /** Localized catalog names resolved on the server — not the full catalog. */
    displayNames?: Record<string, string>;
  }[];
  participants?: {
    role: string;
    averageItemPower: string | null;
  }[];
}

/** Combined victim gear + inventory estimate; null when both are missing or zero. */
export function combinedVictimEstSilver(
  gearEstSilver?: number | null,
  lootEstSilver?: number | null
): number | null {
  const gear = gearEstSilver != null && gearEstSilver > 0 ? gearEstSilver : 0;
  const loot = lootEstSilver != null && lootEstSilver > 0 ? lootEstSilver : 0;
  const total = gear + loot;
  return total > 0 ? total : null;
}

/** Fame participants minus the killer. Null when there is nobody else to show. */
export function assistCountFromParticipants(
  participantCount?: number | null
): number | null {
  if (participantCount == null || !Number.isFinite(participantCount)) return null;
  const assists = Math.max(0, Math.floor(participantCount) - 1);
  return assists > 0 ? assists : null;
}

function extractDisplayItems(
  player: AlbionPlayerRef | undefined,
  ownerRole: "killer" | "victim"
) {
  if (!player) return [];

  const items: NonNullable<KillCardEvent["items"]> = [];

  for (const slot of KILL_CARD_BUILD_SLOTS) {
    const equipped = player.Equipment?.[slot];
    if (!equipped?.Type) continue;
    items.push({
      ownerRole,
      slot,
      itemType: equipped.Type,
      quality: equipped.Quality ?? 0,
      count: equipped.Count ?? 1,
      category: "equipment",
    });
  }

  for (const item of player.Inventory ?? []) {
    if (item?.Type) {
      items.push({
        ownerRole,
        slot: null,
        itemType: item.Type,
        quality: item.Quality ?? 0,
        count: item.Count ?? 1,
        category: "inventory",
      });
    }
  }

  return items;
}

/** Guild membership captured on the kill event payload (not the player's current guild). */
export function guildAtKillFromRef(
  ref: AlbionPlayerRef | undefined
): { name: string; albionId?: string } | null {
  if (!ref) return null;
  const name = ref.GuildName?.trim();
  if (!name) return null;
  return {
    name,
    ...(ref.GuildId ? { albionId: ref.GuildId } : {}),
  };
}

/** Alliance tag at kill time from event payload; null when the player had no alliance tag. */
export function allianceTagAtKillFromRef(
  ref: AlbionPlayerRef | undefined
): string | null {
  const tag = ref?.AllianceTag?.trim();
  return tag || null;
}

/**
 * Guild at kill time only: payload, then denormalized event columns, then
 * participant row. Never falls back to the player's current guild.
 */
export function resolveGuildAtKill(
  ref: AlbionPlayerRef | undefined,
  participantGuildName?: string | null,
  eventGuild?: { name?: string | null; albionId?: string | null } | null
): { name: string; albionId?: string } | null {
  const fromPayload = guildAtKillFromRef(ref);
  if (fromPayload) return fromPayload;

  const eventName = eventGuild?.name?.trim();
  if (eventName) {
    const albionId = eventGuild?.albionId?.trim();
    return albionId ? { name: eventName, albionId } : { name: eventName };
  }

  const name = participantGuildName?.trim();
  if (name) return { name };

  return null;
}

export function albionEventToKillCard(
  region: AlbionRegion,
  event: AlbionEvent
): KillCardEvent {
  const contentType = classifyContentType({
    killer: event.Killer,
    victim: event.Victim,
    participantCount: event.numberOfParticipants,
    groupMemberCount: event.groupMemberCount ?? event.GroupMemberCount,
    groupMembers: event.GroupMembers,
    participants: event.Participants,
  });

  return {
    eventId: event.EventId,
    region,
    occurredAt: new Date(event.TimeStamp),
    contentType,
    totalVictimKillFame: event.TotalVictimKillFame ?? null,
    participantCount:
      event.numberOfParticipants ?? event.Participants?.length ?? null,
    killer: event.Killer?.Id
      ? {
          albionId: event.Killer.Id,
          name: event.Killer.Name ?? "Unknown",
          guild: guildAtKillFromRef(event.Killer),
          allianceTag: allianceTagAtKillFromRef(event.Killer),
        }
      : null,
    victim: event.Victim?.Id
      ? {
          albionId: event.Victim.Id,
          name: event.Victim.Name ?? "Unknown",
          guild: guildAtKillFromRef(event.Victim),
          allianceTag: allianceTagAtKillFromRef(event.Victim),
        }
      : null,
    items: [
      ...extractDisplayItems(event.Killer, "killer"),
      ...extractDisplayItems(event.Victim, "victim"),
    ],
    participants: [
      ...(event.Killer?.AverageItemPower != null
        ? [
            {
              role: "killer",
              averageItemPower: String(event.Killer.AverageItemPower),
            },
          ]
        : []),
      ...(event.Victim?.AverageItemPower != null
        ? [
            {
              role: "victim",
              averageItemPower: String(event.Victim.AverageItemPower),
            },
          ]
        : []),
    ],
  };
}
