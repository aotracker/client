import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import { twitchVodOffsetForKill, twitchVodUrl } from "@/lib/media/urls";

type KillCardVodFields = {
  eventId: number;
  region: string;
  occurredAt: Date | string;
  killer?: { albionId?: string } | null;
  victim?: { albionId?: string } | null;
};

function occurredAtDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function sessionCoversKill(
  startedAt: Date,
  endedAt: Date | null,
  occurredAt: Date
): boolean {
  if (startedAt.getTime() > occurredAt.getTime()) return false;
  if (endedAt && endedAt.getTime() <= occurredAt.getTime()) return false;
  return true;
}

/** Overlay timestamped Twitch VOD urls when killer or victim has a matching session. */
export async function attachTwitchVodsToKillCards<T extends KillCardVodFields>(
  cards: T[]
): Promise<(T & { twitchVodUrl?: string })[]> {
  if (cards.length === 0) return cards;

  const playerKeys: Array<{ region: AlbionRegion; albionId: string }> = [];
  const seenPlayers = new Set<string>();
  let minMs = Number.POSITIVE_INFINITY;
  let maxMs = Number.NEGATIVE_INFINITY;

  for (const card of cards) {
    if (!isRegionEnabled(card.region)) continue;
    const region = card.region as AlbionRegion;
    const occurred = occurredAtDate(card.occurredAt).getTime();
    if (!Number.isNaN(occurred)) {
      minMs = Math.min(minMs, occurred);
      maxMs = Math.max(maxMs, occurred);
    }
    for (const albionId of [card.killer?.albionId, card.victim?.albionId]) {
      if (!albionId) continue;
      const key = `${region}:${albionId}`;
      if (seenPlayers.has(key)) continue;
      seenPlayers.add(key);
      playerKeys.push({ region, albionId });
    }
  }

  if (playerKeys.length === 0 || !Number.isFinite(minMs)) return cards;

  const links = await db
    .select({
      region: schema.playerMediaLinks.region,
      playerAlbionId: schema.playerMediaLinks.playerAlbionId,
      channelId: schema.playerMediaLinks.channelId,
    })
    .from(schema.playerMediaLinks)
    .where(
      and(
        eq(schema.playerMediaLinks.platform, "twitch"),
        or(
          ...playerKeys.map((key) =>
            and(
              eq(schema.playerMediaLinks.region, key.region),
              eq(schema.playerMediaLinks.playerAlbionId, key.albionId)
            )
          )
        )
      )
    );
  if (links.length === 0) return cards;

  const channelByPlayer = new Map(
    links.map((link) => [
      `${link.region}:${link.playerAlbionId}`,
      link.channelId,
    ])
  );
  const channelIds = [...new Set(links.map((link) => link.channelId))];
  const windowStart = new Date(minMs);
  const windowEnd = new Date(maxMs);

  const sessions = await db
    .select({
      channelId: schema.mediaStreamSessions.channelId,
      startedAt: schema.mediaStreamSessions.startedAt,
      endedAt: schema.mediaStreamSessions.endedAt,
      vodId: schema.mediaStreamSessions.vodId,
    })
    .from(schema.mediaStreamSessions)
    .where(
      and(
        eq(schema.mediaStreamSessions.platform, "twitch"),
        inArray(schema.mediaStreamSessions.channelId, channelIds),
        isNotNull(schema.mediaStreamSessions.vodId),
        lte(schema.mediaStreamSessions.startedAt, windowEnd),
        or(
          isNull(schema.mediaStreamSessions.endedAt),
          gte(schema.mediaStreamSessions.endedAt, windowStart)
        )
      )
    )
    .orderBy(desc(schema.mediaStreamSessions.startedAt));

  return cards.map((card) => {
    const occurredAt = occurredAtDate(card.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || !isRegionEnabled(card.region)) {
      return card;
    }
    const region = card.region as AlbionRegion;
    const sides = [card.killer?.albionId, card.victim?.albionId];
    for (const albionId of sides) {
      if (!albionId) continue;
      const channelId = channelByPlayer.get(`${region}:${albionId}`);
      if (!channelId) continue;
      const session = sessions.find(
        (row) =>
          row.channelId === channelId &&
          row.vodId &&
          sessionCoversKill(row.startedAt, row.endedAt, occurredAt)
      );
      if (!session?.vodId) continue;
      return {
        ...card,
        twitchVodUrl: twitchVodUrl(
          session.vodId,
          twitchVodOffsetForKill(occurredAt, session.startedAt)
        ),
      };
    }
    return card;
  });
}
