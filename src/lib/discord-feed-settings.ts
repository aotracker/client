import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getGuildByAlbionId } from "@/lib/db/queries/entities";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import {
  FEED_GUILD_DEATHS,
  FEED_GUILD_KILLS,
  type DiscordFeedFilters,
  type DiscordFeedType,
  type FeedSummary,
} from "@/lib/discord-feed-types";

export {
  FEED_GUILD_DEATHS,
  FEED_GUILD_KILLS,
  type DiscordFeedFilters,
  type DiscordFeedType,
  type FeedSummary,
};

export function parseFeedFilters(value: unknown): DiscordFeedFilters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as DiscordFeedFilters;
}

export function applyFeedFilterPatch(
  current: DiscordFeedFilters,
  patch: {
    minFame?: number | null;
    minSilver?: number | null;
    contentTypes?: string[] | null;
    paused?: boolean | null;
    pingRoleId?: string | null;
  }
): DiscordFeedFilters {
  const next = { ...current };
  if ("minFame" in patch) {
    if (patch.minFame && patch.minFame > 0) next.minFame = patch.minFame;
    else delete next.minFame;
  }
  if ("minSilver" in patch) {
    if (patch.minSilver && patch.minSilver > 0) next.minSilver = patch.minSilver;
    else delete next.minSilver;
  }
  if ("contentTypes" in patch) {
    const types = (patch.contentTypes ?? []).filter(
      (type) => type === "SOLO" || type === "GROUP" || type === "ZVZ"
    );
    if (types.length > 0) next.contentTypes = types;
    else delete next.contentTypes;
  }
  if ("paused" in patch) {
    if (patch.paused) next.paused = true;
    else delete next.paused;
  }
  if ("pingRoleId" in patch) {
    if (patch.pingRoleId) next.pingRoleId = patch.pingRoleId;
    else delete next.pingRoleId;
  }
  return next;
}

export async function listServerFeedSummaries(
  discordGuildId: string
): Promise<FeedSummary[]> {
  const rows = await db
    .select()
    .from(schema.discordFeeds)
    .where(eq(schema.discordFeeds.discordGuildId, discordGuildId));

  const lastPosts =
    rows.length === 0
      ? []
      : await db
          .select({
            feedId: schema.discordPostLog.feedId,
            lastPostedAt: sql<Date>`max(${schema.discordPostLog.postedAt})`.mapWith(
              (value) => (value instanceof Date ? value : new Date(String(value)))
            ),
          })
          .from(schema.discordPostLog)
          .where(
            and(
              inArray(
                schema.discordPostLog.feedId,
                rows.map((row) => row.id)
              ),
              isNotNull(schema.discordPostLog.discordMessageId),
              sql`${schema.discordPostLog.discordMessageId} not like 'skipped:%'`
            )
          )
          .groupBy(schema.discordPostLog.feedId);

  const lastByFeed = new Map(
    lastPosts.map((row) => [row.feedId, row.lastPostedAt.toISOString()])
  );

  return rows
    .filter(
      (row): row is typeof row & { feedType: DiscordFeedType } =>
        row.feedType === FEED_GUILD_KILLS || row.feedType === FEED_GUILD_DEATHS
    )
    .map((row) => ({
      id: row.id,
      feedType: row.feedType,
      targetName: row.targetName,
      targetAlbionId: row.targetAlbionId,
      region: row.region,
      channelId: row.channelId,
      enabled: row.enabled,
      filters: parseFeedFilters(row.filters),
      lastPostedAt: lastByFeed.get(row.id) ?? null,
    }));
}

export async function isDiscordServerInstalled(
  discordGuildId: string
): Promise<boolean> {
  const [row] = await db
    .select({ leftAt: schema.discordServers.leftAt })
    .from(schema.discordServers)
    .where(eq(schema.discordServers.discordGuildId, discordGuildId))
    .limit(1);
  return Boolean(row && !row.leftAt);
}

export async function upsertDiscordServerRow(
  discordGuildId: string,
  name: string | null
): Promise<void> {
  const now = new Date();
  await db
    .insert(schema.discordServers)
    .values({
      discordGuildId,
      name,
      installedAt: now,
      leftAt: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.discordServers.discordGuildId,
      set: { name, leftAt: null, updatedAt: now },
    });
}

export async function trackGuildOnDiscordServer(input: {
  discordGuildId: string;
  discordGuildName: string | null;
  region: AlbionRegion;
  albionGuildId: string;
  createdByUserId: string;
}): Promise<{ ok: true; replaced: boolean } | { ok: false; error: "not_found" }> {
  const guild = await getGuildByAlbionId(input.region, input.albionGuildId);
  if (!guild) return { ok: false, error: "not_found" };

  await upsertDiscordServerRow(input.discordGuildId, input.discordGuildName);

  const existing = await db
    .select()
    .from(schema.discordFeeds)
    .where(eq(schema.discordFeeds.discordGuildId, input.discordGuildId));
  const prior = existing.filter(
    (row) =>
      row.feedType === FEED_GUILD_KILLS || row.feedType === FEED_GUILD_DEATHS
  );
  const replaced =
    prior.length > 0 &&
    prior.some(
      (row) =>
        row.targetAlbionId !== input.albionGuildId ||
        row.region !== input.region
    );

  if (prior.length > 0) {
    await db
      .delete(schema.discordFeeds)
      .where(
        and(
          eq(schema.discordFeeds.discordGuildId, input.discordGuildId),
          inArray(schema.discordFeeds.feedType, [
            FEED_GUILD_KILLS,
            FEED_GUILD_DEATHS,
          ])
        )
      );
  }

  const now = new Date();
  await db.insert(schema.discordFeeds).values([
    {
      discordGuildId: input.discordGuildId,
      feedType: FEED_GUILD_KILLS,
      targetType: "guild",
      targetAlbionId: guild.albionId,
      region: input.region,
      targetName: guild.name,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    },
    {
      discordGuildId: input.discordGuildId,
      feedType: FEED_GUILD_DEATHS,
      targetType: "guild",
      targetAlbionId: guild.albionId,
      region: input.region,
      targetName: guild.name,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  return { ok: true, replaced };
}

export async function untrackGuildOnDiscordServer(
  discordGuildId: string
): Promise<number> {
  const deleted = await db
    .delete(schema.discordFeeds)
    .where(
      and(
        eq(schema.discordFeeds.discordGuildId, discordGuildId),
        inArray(schema.discordFeeds.feedType, [
          FEED_GUILD_KILLS,
          FEED_GUILD_DEATHS,
        ])
      )
    )
    .returning({ id: schema.discordFeeds.id });
  return deleted.length;
}

export async function setDiscordFeedChannel(
  discordGuildId: string,
  feedType: DiscordFeedType,
  channelId: string
): Promise<boolean> {
  const [feed] = await db
    .select()
    .from(schema.discordFeeds)
    .where(
      and(
        eq(schema.discordFeeds.discordGuildId, discordGuildId),
        eq(schema.discordFeeds.feedType, feedType)
      )
    )
    .limit(1);
  if (!feed) return false;

  const now = new Date();
  const patch: {
    channelId: string;
    updatedAt: Date;
    filters?: DiscordFeedFilters;
  } = { channelId, updatedAt: now };
  if (!feed.channelId) {
    patch.filters = {
      ...parseFeedFilters(feed.filters),
      notifyAfter: now.toISOString(),
    };
  }
  await db
    .update(schema.discordFeeds)
    .set(patch)
    .where(eq(schema.discordFeeds.id, feed.id));
  return true;
}

export async function patchDiscordFeedFilters(
  discordGuildId: string,
  feedType: DiscordFeedType,
  patch: Parameters<typeof applyFeedFilterPatch>[1]
): Promise<boolean> {
  const [feed] = await db
    .select()
    .from(schema.discordFeeds)
    .where(
      and(
        eq(schema.discordFeeds.discordGuildId, discordGuildId),
        eq(schema.discordFeeds.feedType, feedType)
      )
    )
    .limit(1);
  if (!feed) return false;
  await db
    .update(schema.discordFeeds)
    .set({
      filters: applyFeedFilterPatch(parseFeedFilters(feed.filters), patch),
      updatedAt: new Date(),
    })
    .where(eq(schema.discordFeeds.id, feed.id));
  return true;
}

export function isAlbionRegion(value: string): value is AlbionRegion {
  return isRegionEnabled(value);
}
