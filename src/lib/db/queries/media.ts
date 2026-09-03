import { cache } from "react";
import { and, desc, eq, gt, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AlbionRegion } from "@/lib/albion/types";
import type { MediaPlatform } from "@/lib/media/urls";
import { getPlayerByAlbionId, getGuildByAlbionId } from "./entities";

export type MediaChannel = {
  platform: MediaPlatform;
  channelId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
};

export type PlayerMediaLinkRow = {
  id: string;
  region: AlbionRegion;
  playerAlbionId: string;
  playerName: string;
  platform: MediaPlatform;
  channelId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GuildMediaPinRow = {
  id: string;
  region: AlbionRegion;
  guildAlbionId: string;
  guildName: string;
  platform: MediaPlatform;
  channelId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MediaLiveSnapshot = {
  platform: MediaPlatform;
  channelId: string;
  isLive: boolean;
  title: string | null;
  viewerCount: number | null;
  startedAt: Date | null;
  thumbnailUrl: string | null;
};

export type MediaStreamSessionRow = {
  id: string;
  platform: MediaPlatform;
  channelId: string;
  startedAt: Date;
  endedAt: Date | null;
  vodId: string | null;
  vodDurationSeconds: number | null;
  title: string | null;
};

export type LivePlayerCard = {
  region: AlbionRegion;
  playerAlbionId: string;
  playerName: string;
  guildName: string | null;
  login: string;
  displayName: string;
  avatarUrl: string | null;
  title: string | null;
  viewerCount: number | null;
  startedAt: Date | null;
  thumbnailUrl: string | null;
};

type ChannelFields = {
  platform: MediaPlatform;
  channelId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
};

export async function listPlayerMediaLinks(): Promise<PlayerMediaLinkRow[]> {
  const rows = await db
    .select()
    .from(schema.playerMediaLinks)
    .orderBy(desc(schema.playerMediaLinks.updatedAt));
  return rows.map(toPlayerLink);
}

export async function listGuildMediaPins(): Promise<GuildMediaPinRow[]> {
  const rows = await db
    .select()
    .from(schema.guildMediaPins)
    .orderBy(desc(schema.guildMediaPins.updatedAt));
  return rows.map(toGuildPin);
}

export const getPlayerMediaLinks = cache(async function getPlayerMediaLinks(
  region: AlbionRegion,
  playerAlbionId: string
): Promise<PlayerMediaLinkRow[]> {
  const rows = await db
    .select()
    .from(schema.playerMediaLinks)
    .where(
      and(
        eq(schema.playerMediaLinks.region, region),
        eq(schema.playerMediaLinks.playerAlbionId, playerAlbionId)
      )
    );
  return rows.map(toPlayerLink);
});

export async function getPlayerMediaLinksForPlayers(
  keys: Array<{ region: AlbionRegion; albionId: string }>
): Promise<PlayerMediaLinkRow[]> {
  if (keys.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.playerMediaLinks)
    .where(
      or(
        ...keys.map((key) =>
          and(
            eq(schema.playerMediaLinks.region, key.region),
            eq(schema.playerMediaLinks.playerAlbionId, key.albionId)
          )
        )
      )
    );
  return rows.map(toPlayerLink);
}

export const getGuildMediaPins = cache(async function getGuildMediaPins(
  region: AlbionRegion,
  guildAlbionId: string
): Promise<GuildMediaPinRow[]> {
  const rows = await db
    .select()
    .from(schema.guildMediaPins)
    .where(
      and(
        eq(schema.guildMediaPins.region, region),
        eq(schema.guildMediaPins.guildAlbionId, guildAlbionId)
      )
    );
  return rows.map(toGuildPin);
});

export const guildHasAttachedMedia = cache(async function guildHasAttachedMedia(
  region: AlbionRegion,
  guildAlbionId: string
): Promise<boolean> {
  const pins = await getGuildMediaPins(region, guildAlbionId);
  if (pins.length > 0) return true;

  const guild = await getGuildByAlbionId(region, guildAlbionId);
  if (!guild) return false;

  const rows = await db
    .select({ id: schema.playerMediaLinks.id })
    .from(schema.playerMediaLinks)
    .innerJoin(
      schema.players,
      and(
        eq(schema.players.region, schema.playerMediaLinks.region),
        eq(schema.players.albionId, schema.playerMediaLinks.playerAlbionId),
        eq(schema.players.guildId, guild.id)
      )
    )
    .limit(1);
  return rows.length > 0;
});

export const allianceHasAttachedMedia = cache(async function allianceHasAttachedMedia(
  region: AlbionRegion,
  allianceAlbionId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: schema.playerMediaLinks.id })
    .from(schema.playerMediaLinks)
    .innerJoin(
      schema.players,
      and(
        eq(schema.players.region, schema.playerMediaLinks.region),
        eq(schema.players.albionId, schema.playerMediaLinks.playerAlbionId)
      )
    )
    .innerJoin(
      schema.guilds,
      and(
        eq(schema.guilds.id, schema.players.guildId),
        eq(schema.guilds.region, region),
        eq(schema.guilds.allianceId, allianceAlbionId)
      )
    )
    .limit(1);
  return rows.length > 0;
});

export async function getLiveStateForChannels(
  channels: Array<{ platform: MediaPlatform; channelId: string }>
): Promise<MediaLiveSnapshot[]> {
  if (channels.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.mediaLiveState)
    .where(
      or(
        ...channels.map((ch) =>
          and(
            eq(schema.mediaLiveState.platform, ch.platform),
            eq(schema.mediaLiveState.channelId, ch.channelId)
          )
        )
      )
    );
  return rows.map((row) => ({
    platform: row.platform as MediaPlatform,
    channelId: row.channelId,
    isLive: row.isLive,
    title: row.title,
    viewerCount: row.viewerCount,
    startedAt: row.startedAt,
    thumbnailUrl: row.thumbnailUrl,
  }));
}

export async function listLivePlayers(options?: {
  region?: AlbionRegion | "all";
  limit?: number;
}): Promise<LivePlayerCard[]> {
  const region = options?.region;
  const limit = options?.limit ?? 24;
  const conditions = [
    eq(schema.playerMediaLinks.platform, "twitch"),
    eq(schema.mediaLiveState.isLive, true),
  ];
  if (region && region !== "all") {
    conditions.push(eq(schema.playerMediaLinks.region, region));
  }

  const rows = await db
    .select({
      region: schema.playerMediaLinks.region,
      playerAlbionId: schema.playerMediaLinks.playerAlbionId,
      playerName: schema.playerMediaLinks.playerName,
      login: schema.playerMediaLinks.login,
      displayName: schema.playerMediaLinks.displayName,
      avatarUrl: schema.playerMediaLinks.avatarUrl,
      title: schema.mediaLiveState.title,
      viewerCount: schema.mediaLiveState.viewerCount,
      startedAt: schema.mediaLiveState.startedAt,
      thumbnailUrl: schema.mediaLiveState.thumbnailUrl,
      guildName: schema.guilds.name,
    })
    .from(schema.playerMediaLinks)
    .innerJoin(
      schema.mediaLiveState,
      and(
        eq(schema.mediaLiveState.platform, schema.playerMediaLinks.platform),
        eq(schema.mediaLiveState.channelId, schema.playerMediaLinks.channelId)
      )
    )
    .leftJoin(
      schema.players,
      and(
        eq(schema.players.region, schema.playerMediaLinks.region),
        eq(schema.players.albionId, schema.playerMediaLinks.playerAlbionId)
      )
    )
    .leftJoin(schema.guilds, eq(schema.guilds.id, schema.players.guildId))
    .where(and(...conditions))
    .orderBy(desc(schema.mediaLiveState.viewerCount))
    .limit(limit);

  return rows.map((row) => ({
    region: row.region,
    playerAlbionId: row.playerAlbionId,
    playerName: row.playerName,
    guildName: row.guildName,
    login: row.login,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    title: row.title,
    viewerCount: row.viewerCount,
    startedAt: row.startedAt,
    thumbnailUrl: row.thumbnailUrl,
  }));
}

export async function listLiveGuildMembers(
  region: AlbionRegion,
  guildAlbionId: string
): Promise<LivePlayerCard[]> {
  const guild = await getGuildByAlbionId(region, guildAlbionId);
  if (!guild) return [];

  const rows = await db
    .select({
      region: schema.playerMediaLinks.region,
      playerAlbionId: schema.playerMediaLinks.playerAlbionId,
      playerName: schema.playerMediaLinks.playerName,
      login: schema.playerMediaLinks.login,
      displayName: schema.playerMediaLinks.displayName,
      avatarUrl: schema.playerMediaLinks.avatarUrl,
      title: schema.mediaLiveState.title,
      viewerCount: schema.mediaLiveState.viewerCount,
      startedAt: schema.mediaLiveState.startedAt,
      thumbnailUrl: schema.mediaLiveState.thumbnailUrl,
    })
    .from(schema.playerMediaLinks)
    .innerJoin(
      schema.players,
      and(
        eq(schema.players.region, schema.playerMediaLinks.region),
        eq(schema.players.albionId, schema.playerMediaLinks.playerAlbionId),
        eq(schema.players.guildId, guild.id)
      )
    )
    .innerJoin(
      schema.mediaLiveState,
      and(
        eq(schema.mediaLiveState.platform, schema.playerMediaLinks.platform),
        eq(schema.mediaLiveState.channelId, schema.playerMediaLinks.channelId),
        eq(schema.mediaLiveState.isLive, true)
      )
    )
    .where(eq(schema.playerMediaLinks.platform, "twitch"))
    .orderBy(desc(schema.mediaLiveState.viewerCount));

  return rows.map((row) => ({
    ...row,
    guildName: guild.name,
  }));
}

export async function listLiveAllianceMembers(
  region: AlbionRegion,
  allianceAlbionId: string
): Promise<LivePlayerCard[]> {
  const rows = await db
    .select({
      region: schema.playerMediaLinks.region,
      playerAlbionId: schema.playerMediaLinks.playerAlbionId,
      playerName: schema.playerMediaLinks.playerName,
      login: schema.playerMediaLinks.login,
      displayName: schema.playerMediaLinks.displayName,
      avatarUrl: schema.playerMediaLinks.avatarUrl,
      title: schema.mediaLiveState.title,
      viewerCount: schema.mediaLiveState.viewerCount,
      startedAt: schema.mediaLiveState.startedAt,
      thumbnailUrl: schema.mediaLiveState.thumbnailUrl,
      guildName: schema.guilds.name,
    })
    .from(schema.playerMediaLinks)
    .innerJoin(
      schema.players,
      and(
        eq(schema.players.region, schema.playerMediaLinks.region),
        eq(schema.players.albionId, schema.playerMediaLinks.playerAlbionId)
      )
    )
    .innerJoin(
      schema.guilds,
      and(
        eq(schema.guilds.id, schema.players.guildId),
        eq(schema.guilds.region, region),
        eq(schema.guilds.allianceId, allianceAlbionId)
      )
    )
    .innerJoin(
      schema.mediaLiveState,
      and(
        eq(schema.mediaLiveState.platform, schema.playerMediaLinks.platform),
        eq(schema.mediaLiveState.channelId, schema.playerMediaLinks.channelId),
        eq(schema.mediaLiveState.isLive, true)
      )
    )
    .where(eq(schema.playerMediaLinks.platform, "twitch"))
    .orderBy(desc(schema.mediaLiveState.viewerCount));

  return rows.map((row) => ({
    ...row,
    guildName: row.guildName,
  }));
}

export type GuildMemberSession = MediaStreamSessionRow & {
  playerName: string;
  login: string;
};

export async function listRecentGuildMemberSessions(
  region: AlbionRegion,
  guildAlbionId: string,
  limit = 8
): Promise<GuildMemberSession[]> {
  const guild = await getGuildByAlbionId(region, guildAlbionId);
  if (!guild) return [];

  const rows = await db
    .select({
      id: schema.mediaStreamSessions.id,
      platform: schema.mediaStreamSessions.platform,
      channelId: schema.mediaStreamSessions.channelId,
      startedAt: schema.mediaStreamSessions.startedAt,
      endedAt: schema.mediaStreamSessions.endedAt,
      vodId: schema.mediaStreamSessions.vodId,
      vodDurationSeconds: schema.mediaStreamSessions.vodDurationSeconds,
      title: schema.mediaStreamSessions.title,
      playerName: schema.playerMediaLinks.playerName,
      login: schema.playerMediaLinks.login,
    })
    .from(schema.mediaStreamSessions)
    .innerJoin(
      schema.playerMediaLinks,
      and(
        eq(
          schema.playerMediaLinks.platform,
          schema.mediaStreamSessions.platform
        ),
        eq(
          schema.playerMediaLinks.channelId,
          schema.mediaStreamSessions.channelId
        ),
        eq(schema.playerMediaLinks.region, region)
      )
    )
    .innerJoin(
      schema.players,
      and(
        eq(schema.players.region, schema.playerMediaLinks.region),
        eq(schema.players.albionId, schema.playerMediaLinks.playerAlbionId),
        eq(schema.players.guildId, guild.id)
      )
    )
    .where(
      and(
        eq(schema.mediaStreamSessions.platform, "twitch"),
        isNotNull(schema.mediaStreamSessions.vodId)
      )
    )
    .orderBy(desc(schema.mediaStreamSessions.startedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    platform: row.platform as MediaPlatform,
    channelId: row.channelId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    vodId: row.vodId,
    vodDurationSeconds: row.vodDurationSeconds,
    title: row.title,
    playerName: row.playerName,
    login: row.login,
  }));
}

export async function listRecentAllianceMemberSessions(
  region: AlbionRegion,
  allianceAlbionId: string,
  limit = 8
): Promise<GuildMemberSession[]> {
  const rows = await db
    .select({
      id: schema.mediaStreamSessions.id,
      platform: schema.mediaStreamSessions.platform,
      channelId: schema.mediaStreamSessions.channelId,
      startedAt: schema.mediaStreamSessions.startedAt,
      endedAt: schema.mediaStreamSessions.endedAt,
      vodId: schema.mediaStreamSessions.vodId,
      vodDurationSeconds: schema.mediaStreamSessions.vodDurationSeconds,
      title: schema.mediaStreamSessions.title,
      playerName: schema.playerMediaLinks.playerName,
      login: schema.playerMediaLinks.login,
    })
    .from(schema.mediaStreamSessions)
    .innerJoin(
      schema.playerMediaLinks,
      and(
        eq(
          schema.playerMediaLinks.platform,
          schema.mediaStreamSessions.platform
        ),
        eq(
          schema.playerMediaLinks.channelId,
          schema.mediaStreamSessions.channelId
        ),
        eq(schema.playerMediaLinks.region, region)
      )
    )
    .innerJoin(
      schema.players,
      and(
        eq(schema.players.region, schema.playerMediaLinks.region),
        eq(schema.players.albionId, schema.playerMediaLinks.playerAlbionId)
      )
    )
    .innerJoin(
      schema.guilds,
      and(
        eq(schema.guilds.id, schema.players.guildId),
        eq(schema.guilds.region, region),
        eq(schema.guilds.allianceId, allianceAlbionId)
      )
    )
    .where(
      and(
        eq(schema.mediaStreamSessions.platform, "twitch"),
        isNotNull(schema.mediaStreamSessions.vodId)
      )
    )
    .orderBy(desc(schema.mediaStreamSessions.startedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    platform: row.platform as MediaPlatform,
    channelId: row.channelId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    vodId: row.vodId,
    vodDurationSeconds: row.vodDurationSeconds,
    title: row.title,
    playerName: row.playerName,
    login: row.login,
  }));
}

export async function listLiveGuildKeys(
  keys: Array<{ region: AlbionRegion; albionId: string }>
): Promise<Array<{ region: AlbionRegion; albionId: string }>> {
  if (keys.length === 0) return [];
  const rows = await db
    .select({
      region: schema.guilds.region,
      albionId: schema.guilds.albionId,
    })
    .from(schema.playerMediaLinks)
    .innerJoin(
      schema.mediaLiveState,
      and(
        eq(schema.mediaLiveState.platform, schema.playerMediaLinks.platform),
        eq(schema.mediaLiveState.channelId, schema.playerMediaLinks.channelId),
        eq(schema.mediaLiveState.isLive, true)
      )
    )
    .innerJoin(
      schema.players,
      and(
        eq(schema.players.region, schema.playerMediaLinks.region),
        eq(schema.players.albionId, schema.playerMediaLinks.playerAlbionId)
      )
    )
    .innerJoin(schema.guilds, eq(schema.guilds.id, schema.players.guildId))
    .where(
      and(
        eq(schema.playerMediaLinks.platform, "twitch"),
        or(
          ...keys.map((key) =>
            and(
              eq(schema.guilds.region, key.region),
              eq(schema.guilds.albionId, key.albionId)
            )
          )
        )
      )
    );

  const seen = new Set<string>();
  const out: Array<{ region: AlbionRegion; albionId: string }> = [];
  for (const row of rows) {
    const id = `${row.region}:${row.albionId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ region: row.region, albionId: row.albionId });
  }
  return out;
}

export async function listRecentSessionsForChannels(
  channels: Array<{ platform: MediaPlatform; channelId: string }>,
  limitPerChannel = 4
): Promise<MediaStreamSessionRow[]> {
  if (channels.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.mediaStreamSessions)
    .where(
      or(
        ...channels.map((ch) =>
          and(
            eq(schema.mediaStreamSessions.platform, ch.platform),
            eq(schema.mediaStreamSessions.channelId, ch.channelId)
          )
        )
      )
    )
    .orderBy(desc(schema.mediaStreamSessions.startedAt))
    .limit(Math.max(limitPerChannel * channels.length, limitPerChannel));

  const grouped = new Map<string, MediaStreamSessionRow[]>();
  for (const row of rows) {
    const key = `${row.platform}:${row.channelId}`;
    const list = grouped.get(key) ?? [];
    if (list.length >= limitPerChannel) continue;
    list.push({
      id: row.id,
      platform: row.platform as MediaPlatform,
      channelId: row.channelId,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      vodId: row.vodId,
      vodDurationSeconds: row.vodDurationSeconds,
      title: row.title,
    });
    grouped.set(key, list);
  }
  return [...grouped.values()].flat();
}

export async function findKillWatchAround(input: {
  region: AlbionRegion;
  occurredAt: Date;
  playerAlbionIds: string[];
}): Promise<
  Array<{
    role: "killer" | "victim";
    playerAlbionId: string;
    playerName: string;
    login: string;
    session: MediaStreamSessionRow;
    live: boolean;
  }>
> {
  const ids = input.playerAlbionIds.filter(Boolean);
  if (ids.length === 0) return [];

  const links = await db
    .select()
    .from(schema.playerMediaLinks)
    .where(
      and(
        eq(schema.playerMediaLinks.region, input.region),
        eq(schema.playerMediaLinks.platform, "twitch"),
        inArray(schema.playerMediaLinks.playerAlbionId, ids)
      )
    );
  if (links.length === 0) return [];

  const channelIds = links.map((link) => link.channelId);
  const sessions = await db
    .select()
    .from(schema.mediaStreamSessions)
    .where(
      and(
        eq(schema.mediaStreamSessions.platform, "twitch"),
        inArray(schema.mediaStreamSessions.channelId, channelIds),
        lte(schema.mediaStreamSessions.startedAt, input.occurredAt),
        or(
          isNull(schema.mediaStreamSessions.endedAt),
          gt(schema.mediaStreamSessions.endedAt, input.occurredAt)
        )
      )
    )
    .orderBy(desc(schema.mediaStreamSessions.startedAt));

  const liveRows = await db
    .select({
      channelId: schema.mediaLiveState.channelId,
      isLive: schema.mediaLiveState.isLive,
    })
    .from(schema.mediaLiveState)
    .where(
      and(
        eq(schema.mediaLiveState.platform, "twitch"),
        inArray(schema.mediaLiveState.channelId, channelIds)
      )
    );
  const liveSet = new Set(
    liveRows.filter((row) => row.isLive).map((row) => row.channelId)
  );

  const byChannel = new Map(sessions.map((row) => [row.channelId, row]));
  const results: Array<{
    role: "killer" | "victim";
    playerAlbionId: string;
    playerName: string;
    login: string;
    session: MediaStreamSessionRow;
    live: boolean;
  }> = [];

  for (const link of links) {
    const session = byChannel.get(link.channelId);
    if (!session) continue;
    results.push({
      role: "killer",
      playerAlbionId: link.playerAlbionId,
      playerName: link.playerName,
      login: link.login,
      live: liveSet.has(link.channelId),
      session: {
        id: session.id,
        platform: "twitch",
        channelId: session.channelId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        vodId: session.vodId,
        vodDurationSeconds: session.vodDurationSeconds,
        title: session.title,
      },
    });
  }
  return results;
}

export async function attachPlayerMedia(input: {
  region: AlbionRegion;
  playerAlbionId: string;
  createdByUserId: string | null;
  channel: ChannelFields;
}): Promise<PlayerMediaLinkRow> {
  const player = await getPlayerByAlbionId(input.region, input.playerAlbionId);
  if (!player) {
    throw new Error("player_not_found");
  }

  const stale: Array<{ platform: MediaPlatform; channelId: string }> = [];
  await db.transaction(async (tx) => {
    const previous = await tx
      .select({
        platform: schema.playerMediaLinks.platform,
        channelId: schema.playerMediaLinks.channelId,
      })
      .from(schema.playerMediaLinks)
      .where(
        or(
          and(
            eq(schema.playerMediaLinks.region, input.region),
            eq(schema.playerMediaLinks.playerAlbionId, input.playerAlbionId),
            eq(schema.playerMediaLinks.platform, input.channel.platform)
          ),
          and(
            eq(schema.playerMediaLinks.platform, input.channel.platform),
            eq(schema.playerMediaLinks.channelId, input.channel.channelId)
          )
        )
      );
    for (const row of previous) {
      if (
        row.channelId !== input.channel.channelId ||
        row.platform !== input.channel.platform
      ) {
        stale.push({
          platform: row.platform as MediaPlatform,
          channelId: row.channelId,
        });
      }
    }
    await tx
      .delete(schema.playerMediaLinks)
      .where(
        and(
          eq(schema.playerMediaLinks.region, input.region),
          eq(schema.playerMediaLinks.playerAlbionId, input.playerAlbionId),
          eq(schema.playerMediaLinks.platform, input.channel.platform)
        )
      );
    await tx
      .delete(schema.playerMediaLinks)
      .where(
        and(
          eq(schema.playerMediaLinks.platform, input.channel.platform),
          eq(schema.playerMediaLinks.channelId, input.channel.channelId)
        )
      );
    await tx.insert(schema.playerMediaLinks).values({
      region: input.region,
      playerAlbionId: player.albionId,
      playerName: player.name,
      platform: input.channel.platform,
      channelId: input.channel.channelId,
      login: input.channel.login,
      displayName: input.channel.displayName,
      avatarUrl: input.channel.avatarUrl,
      createdByUserId: input.createdByUserId,
      updatedAt: new Date(),
    });
  });

  for (const channel of stale) {
    await cleanupUnusedChannel(channel.platform, channel.channelId);
  }

  const [row] = await db
    .select()
    .from(schema.playerMediaLinks)
    .where(
      and(
        eq(schema.playerMediaLinks.region, input.region),
        eq(schema.playerMediaLinks.playerAlbionId, player.albionId),
        eq(schema.playerMediaLinks.platform, input.channel.platform)
      )
    )
    .limit(1);
  if (!row) throw new Error("attach_failed");
  return toPlayerLink(row);
}

export async function attachGuildMediaPin(input: {
  region: AlbionRegion;
  guildAlbionId: string;
  createdByUserId: string | null;
  channel: ChannelFields;
}): Promise<GuildMediaPinRow> {
  const guild = await getGuildByAlbionId(input.region, input.guildAlbionId);
  if (!guild) {
    throw new Error("guild_not_found");
  }

  const [row] = await db
    .insert(schema.guildMediaPins)
    .values({
      region: input.region,
      guildAlbionId: guild.albionId,
      guildName: guild.name,
      platform: input.channel.platform,
      channelId: input.channel.channelId,
      login: input.channel.login,
      displayName: input.channel.displayName,
      avatarUrl: input.channel.avatarUrl,
      createdByUserId: input.createdByUserId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        schema.guildMediaPins.region,
        schema.guildMediaPins.guildAlbionId,
        schema.guildMediaPins.platform,
      ],
      set: {
        guildName: guild.name,
        channelId: input.channel.channelId,
        login: input.channel.login,
        displayName: input.channel.displayName,
        avatarUrl: input.channel.avatarUrl,
        createdByUserId: input.createdByUserId,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new Error("attach_failed");
  return toGuildPin(row);
}

export async function unlinkPlayerMedia(id: string): Promise<boolean> {
  const [row] = await db
    .delete(schema.playerMediaLinks)
    .where(eq(schema.playerMediaLinks.id, id))
    .returning({
      platform: schema.playerMediaLinks.platform,
      channelId: schema.playerMediaLinks.channelId,
    });
  if (!row) return false;
  await cleanupUnusedChannel(
    row.platform as MediaPlatform,
    row.channelId
  );
  return true;
}

export async function unlinkGuildMediaPin(id: string): Promise<boolean> {
  const [row] = await db
    .delete(schema.guildMediaPins)
    .where(eq(schema.guildMediaPins.id, id))
    .returning({
      platform: schema.guildMediaPins.platform,
      channelId: schema.guildMediaPins.channelId,
    });
  if (!row) return false;
  await cleanupUnusedChannel(
    row.platform as MediaPlatform,
    row.channelId
  );
  return true;
}

async function cleanupUnusedChannel(
  platform: MediaPlatform,
  channelId: string
): Promise<void> {
  const [player, pin] = await Promise.all([
    db
      .select({ id: schema.playerMediaLinks.id })
      .from(schema.playerMediaLinks)
      .where(
        and(
          eq(schema.playerMediaLinks.platform, platform),
          eq(schema.playerMediaLinks.channelId, channelId)
        )
      )
      .limit(1),
    db
      .select({ id: schema.guildMediaPins.id })
      .from(schema.guildMediaPins)
      .where(
        and(
          eq(schema.guildMediaPins.platform, platform),
          eq(schema.guildMediaPins.channelId, channelId)
        )
      )
      .limit(1),
  ]);
  if (player.length > 0 || pin.length > 0) return;
  await Promise.all([
    db
      .delete(schema.mediaLiveState)
      .where(
        and(
          eq(schema.mediaLiveState.platform, platform),
          eq(schema.mediaLiveState.channelId, channelId)
        )
      ),
    db
      .delete(schema.mediaStreamSessions)
      .where(
        and(
          eq(schema.mediaStreamSessions.platform, platform),
          eq(schema.mediaStreamSessions.channelId, channelId)
        )
      ),
  ]);
}

function toPlayerLink(
  row: typeof schema.playerMediaLinks.$inferSelect
): PlayerMediaLinkRow {
  return {
    id: row.id,
    region: row.region,
    playerAlbionId: row.playerAlbionId,
    playerName: row.playerName,
    platform: row.platform as MediaPlatform,
    channelId: row.channelId,
    login: row.login,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toGuildPin(
  row: typeof schema.guildMediaPins.$inferSelect
): GuildMediaPinRow {
  return {
    id: row.id,
    region: row.region,
    guildAlbionId: row.guildAlbionId,
    guildName: row.guildName,
    platform: row.platform as MediaPlatform,
    channelId: row.channelId,
    login: row.login,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
