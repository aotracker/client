import "server-only";

import { and, count, desc, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cronHasActiveError, isWorkerAlive } from "@/lib/jobs/worker-state";
import {
  DISCORD_BOT_ALIVE_MS,
  DISCORD_BOT_JOB_KEY,
  type DiscordBotDisplayStatus,
  type DiscordBotStatus,
} from "./discord-bot-status-shared";

export {
  DISCORD_BOT_ALIVE_MS,
  DISCORD_BOT_JOB_KEY,
  emptyDiscordBotStatus,
  type DiscordBotDisplayStatus,
  type DiscordBotStatus,
} from "./discord-bot-status-shared";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function emptyUsage() {
  return {
    servers: 0,
    activeServers: 0,
    enabledFeeds: 0,
    feedsWithChannel: 0,
    lastPostAt: null as string | null,
    postsLastHour: 0,
  };
}

async function getDiscordUsage() {
  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [
      serverCount,
      activeServerCount,
      enabledFeedCount,
      channelFeedCount,
      lastPost,
      recentPosts,
    ] = await Promise.all([
      db.select({ value: count() }).from(schema.discordServers),
      db
        .select({ value: count() })
        .from(schema.discordServers)
        .where(isNull(schema.discordServers.leftAt)),
      db
        .select({ value: count() })
        .from(schema.discordFeeds)
        .where(eq(schema.discordFeeds.enabled, 1)),
      db
        .select({ value: count() })
        .from(schema.discordFeeds)
        .where(
          and(
            eq(schema.discordFeeds.enabled, 1),
            isNotNull(schema.discordFeeds.channelId)
          )
        ),
      db
        .select({ postedAt: schema.discordPostLog.postedAt })
        .from(schema.discordPostLog)
        .orderBy(desc(schema.discordPostLog.postedAt))
        .limit(1),
      db
        .select({ value: count() })
        .from(schema.discordPostLog)
        .where(gte(schema.discordPostLog.postedAt, hourAgo)),
    ]);

    return {
      servers: serverCount[0]?.value ?? 0,
      activeServers: activeServerCount[0]?.value ?? 0,
      enabledFeeds: enabledFeedCount[0]?.value ?? 0,
      feedsWithChannel: channelFeedCount[0]?.value ?? 0,
      lastPostAt: lastPost[0]?.postedAt?.toISOString() ?? null,
      postsLastHour: recentPosts[0]?.value ?? 0,
    };
  } catch {
    return emptyUsage();
  }
}

function resolveDisplayStatus(input: {
  hasActiveError: boolean;
  isAlive: boolean;
  lastHeartbeatAt: string | null;
}): DiscordBotDisplayStatus {
  if (input.hasActiveError) return "error";
  if (input.isAlive) return "online";
  if (input.lastHeartbeatAt) return "down";
  return "unknown";
}

export async function getDiscordBotStatus(): Promise<DiscordBotStatus> {
  let row: typeof schema.cronJobState.$inferSelect | undefined;
  try {
    row = await db.query.cronJobState.findFirst({
      where: eq(schema.cronJobState.jobKey, DISCORD_BOT_JOB_KEY),
    });
  } catch {
    row = undefined;
  }

  const lastStatus =
    row?.lastStatus === "success" || row?.lastStatus === "error"
      ? row.lastStatus
      : null;
  const hasActiveError = cronHasActiveError({
    lastStatus,
    lastSuccessAt: row?.lastSuccessAt ?? null,
    lastErrorAt: row?.lastErrorAt ?? null,
    lastErrorMessage: row?.lastErrorMessage ?? null,
  });
  const lastHeartbeatAt = row?.lastRunAt?.toISOString() ?? null;
  const isAlive = isWorkerAlive(row?.lastRunAt ?? null, DISCORD_BOT_ALIVE_MS);
  const result = asRecord(row?.lastResult);
  const usage = await getDiscordUsage();

  return {
    displayStatus: resolveDisplayStatus({
      hasActiveError,
      isAlive,
      lastHeartbeatAt,
    }),
    isAlive,
    hasActiveError,
    lastHeartbeatAt,
    lastErrorMessage: hasActiveError ? (row?.lastErrorMessage ?? null) : null,
    tag: asString(result?.tag),
    userId: asString(result?.userId),
    gatewayGuilds: asNumber(result?.guilds),
    ping: asNumber(result?.ping),
    ...usage,
    fetchedAt: new Date().toISOString(),
  };
}
