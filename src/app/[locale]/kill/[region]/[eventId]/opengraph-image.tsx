import {
  formatExactDateTime,
  formatFame,
  formatItemPower,
  regionLabel,
} from "@/lib/utils";
import { createKillOgImage, createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { getKillEvent } from "@/lib/db/queries";
import { resolveGuildAtKill } from "@/lib/albion/player-history";
import {
  contentTypeLabel,
  isRegionEnabled,
  type AlbionEvent,
  type AlbionRegion,
} from "@/lib/albion/types";

export const alt = "Kill details";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

interface Props {
  params: Promise<{ region: string; eventId: string }>;
}

export default async function Image({ params }: Props) {
  const { region, eventId } = await params;
  const parsedEventId = parseInt(eventId, 10);

  if (!isRegionEnabled(region) || Number.isNaN(parsedEventId)) {
    return createOgImage({
      title: "Kill not found",
      subtitle: "This kill event is unavailable.",
      badge: regionLabel(region),
    });
  }

  const event = await getKillEvent(region as AlbionRegion, parsedEventId);
  if (!event) {
    return createOgImage({
      title: "Loading kill…",
      subtitle: "Kill details are still being fetched.",
      badge: regionLabel(region),
    });
  }

  const payload = (event.rawPayload as AlbionEvent | null) ?? null;
  const killerParticipant = event.participants.find((p) => p.role === "killer");
  const victimParticipant = event.participants.find((p) => p.role === "victim");

  const killerGuild =
    resolveGuildAtKill(payload?.Killer, killerParticipant?.guildName, {
      name: event.killerGuildName,
      albionId: event.killerGuildAlbionId,
    })?.name ?? null;
  const victimGuild =
    resolveGuildAtKill(payload?.Victim, victimParticipant?.guildName, {
      name: event.victimGuildName,
      albionId: event.victimGuildAlbionId,
    })?.name ?? null;

  return createKillOgImage({
    killer: {
      name: event.killer?.name ?? "?",
      guild: killerGuild,
      ip: formatItemPower(killerParticipant?.averageItemPower),
    },
    victim: {
      name: event.victim?.name ?? "?",
      guild: victimGuild,
      ip: formatItemPower(victimParticipant?.averageItemPower),
    },
    subtitle: `${regionLabel(event.region)} · ${formatExactDateTime(event.occurredAt)}`,
    badge: event.isOrangeZone
      ? `Orange Zone · ${contentTypeLabel(event.contentType)}`
      : contentTypeLabel(event.contentType),
    fame: formatFame(event.totalVictimKillFame),
    players:
      event.contentType !== "SOLO" &&
      event.participantCount != null &&
      event.participantCount > 0
        ? String(event.participantCount)
        : null,
  });
}
