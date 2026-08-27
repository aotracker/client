import {
  albionEventToKillCard,
  resolveGuildAtKill,
} from "@/lib/albion/player-history";
import type { AlbionEvent, AlbionRegion } from "@/lib/albion/types";

export type KillCardItemSource = {
  ownerRole: string;
  slot: string | null;
  itemType: string;
  quality: number | null;
  category: string;
  count?: number | null;
};

export type KillEventCardSource = {
  eventId: number;
  region: AlbionRegion;
  occurredAt: Date;
  contentType: string;
  totalVictimKillFame: number | null;
  participantCount?: number | null;
  lootEstSilver?: number | null;
  gearEstSilver?: number | null;
  detailEvictedAt?: Date | null;
  killerGuildAlbionId?: string | null;
  killerGuildName?: string | null;
  victimGuildAlbionId?: string | null;
  victimGuildName?: string | null;
  rawPayload?: unknown | null;
  killer?: {
    albionId: string;
    name: string;
  } | null;
  victim?: {
    albionId: string;
    name: string;
  } | null;
  items?: KillCardItemSource[];
  participants?: {
    role: string;
    guildName?: string | null;
    averageItemPower: string | null;
  }[];
};

function participantGuildName(
  participants: KillEventCardSource["participants"],
  role: "killer" | "victim"
) {
  return participants?.find((p) => p.role === role)?.guildName ?? null;
}

/** Map a stored kill to list-card fields using guilds captured at kill time only. */
export function mapKillEventToCard(event: KillEventCardSource) {
  const payload =
    event.rawPayload && !event.detailEvictedAt
      ? (event.rawPayload as AlbionEvent)
      : null;
  const extras = payload
    ? albionEventToKillCard(event.region, payload)
    : null;

  const killerGuild = resolveGuildAtKill(
    payload?.Killer,
    participantGuildName(event.participants, "killer"),
    {
      name: event.killerGuildName,
      albionId: event.killerGuildAlbionId,
    }
  );
  const victimGuild = resolveGuildAtKill(
    payload?.Victim,
    participantGuildName(event.participants, "victim"),
    {
      name: event.victimGuildName,
      albionId: event.victimGuildAlbionId,
    }
  );

  return {
    eventId: event.eventId,
    region: event.region,
    occurredAt: event.occurredAt,
    contentType: event.contentType,
    totalVictimKillFame: event.totalVictimKillFame,
    participantCount: event.participantCount ?? extras?.participantCount ?? null,
    lootEstSilver: event.lootEstSilver ?? null,
    gearEstSilver: event.gearEstSilver ?? null,
    killer:
      event.killer || extras?.killer
        ? {
            albionId: event.killer?.albionId ?? extras!.killer!.albionId,
            name: event.killer?.name ?? extras?.killer?.name ?? "Unknown",
            guild: killerGuild,
            allianceTag: extras?.killer?.allianceTag ?? null,
          }
        : null,
    victim:
      event.victim || extras?.victim
        ? {
            albionId: event.victim?.albionId ?? extras!.victim!.albionId,
            name: event.victim?.name ?? extras?.victim?.name ?? "Unknown",
            guild: victimGuild,
            allianceTag: extras?.victim?.allianceTag ?? null,
          }
        : null,
    items: extras?.items ?? event.items,
    participants: extras?.participants ?? event.participants,
  };
}
