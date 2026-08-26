import { NextResponse } from "next/server";
import { discordInviteUrl } from "@/lib/discord-invite";
import { requireDiscordManageGuild } from "@/lib/discord-manage-auth";
import {
  FEED_GUILD_BATTLES,
  FEED_GUILD_DEATHS,
  FEED_GUILD_KILLS,
  getDiscordPreviewMessageId,
  isAlbionRegion,
  isDiscordServerInstalled,
  listServerFeedSummaries,
  patchDiscordFeedFilters,
  recordDiscordPreviewMessage,
  setDiscordFeedChannel,
  trackGuildOnDiscordServer,
  untrackGuildOnDiscordServer,
  type DiscordFeedType,
} from "@/lib/discord-feed-settings";
import {
  botIsInGuild,
  listGuildRoles,
  listGuildTextChannels,
  postOrEditBattlePreviewMessage,
  postTestMessage,
} from "@/lib/discord-bot-api";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ guildId: string }> };

function invite(): string | null {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID?.trim();
  return clientId ? discordInviteUrl(clientId) : null;
}

function feedTypeFrom(value: unknown): DiscordFeedType | null {
  if (value === "kills" || value === FEED_GUILD_KILLS) return FEED_GUILD_KILLS;
  if (value === "deaths" || value === FEED_GUILD_DEATHS) return FEED_GUILD_DEATHS;
  if (value === "battles" || value === FEED_GUILD_BATTLES) return FEED_GUILD_BATTLES;
  return null;
}

async function botInstalled(guildId: string): Promise<boolean> {
  const [fromDb, fromApi] = await Promise.all([
    isDiscordServerInstalled(guildId),
    botIsInGuild(guildId),
  ]);
  return fromDb || fromApi;
}

export async function GET(_request: Request, context: RouteContext) {
  const { guildId } = await context.params;
  const access = await requireDiscordManageGuild(guildId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [feeds, channelsResult, rolesResult, installed] = await Promise.all([
    listServerFeedSummaries(guildId),
    listGuildTextChannels(guildId),
    listGuildRoles(guildId),
    botInstalled(guildId),
  ]);

  const channelsOk = channelsResult.ok;

  return NextResponse.json({
    guild: { id: access.guild.id, name: access.guild.name },
    botInstalled: installed,
    inviteUrl: invite(),
    channels: channelsOk ? channelsResult.channels : [],
    roles: rolesResult.ok ? rolesResult.roles : [],
    channelsError: channelsOk ? null : channelsResult.reason,
    rolesError: rolesResult.ok ? null : rolesResult.reason,
    feeds,
    botTokenConfigured: Boolean(process.env.DISCORD_BOT_TOKEN?.trim()),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { guildId } = await context.params;
  const access = await requireDiscordManageGuild(guildId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const installed = await botInstalled(guildId);
  if (!installed && action !== "status") {
    return NextResponse.json(
      { error: "bot_not_installed", inviteUrl: invite() },
      { status: 409 }
    );
  }

  if (action === "track") {
    const region = typeof body.region === "string" ? body.region : "";
    const albionGuildId =
      typeof body.albionGuildId === "string" ? body.albionGuildId.trim() : "";
    if (!isAlbionRegion(region) || !albionGuildId) {
      return NextResponse.json({ error: "invalid_guild" }, { status: 400 });
    }
    const result = await trackGuildOnDiscordServer({
      discordGuildId: guildId,
      discordGuildName: access.guild.name,
      region,
      albionGuildId,
      createdByUserId: access.userId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: "not_found" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      replaced: result.replaced,
      feeds: await listServerFeedSummaries(guildId),
    });
  }

  if (action === "untrack") {
    const removed = await untrackGuildOnDiscordServer(guildId);
    return NextResponse.json({
      ok: true,
      removed,
      feeds: await listServerFeedSummaries(guildId),
    });
  }

  if (action === "set-channel") {
    const feedType = feedTypeFrom(body.feed);
    const channelId = typeof body.channelId === "string" ? body.channelId : "";
    if (!feedType || !channelId) {
      return NextResponse.json({ error: "invalid_channel" }, { status: 400 });
    }
    const channels = await listGuildTextChannels(guildId);
    if (!channels.ok || !channels.channels.some((channel) => channel.id === channelId)) {
      return NextResponse.json({ error: "invalid_channel" }, { status: 400 });
    }
    const ok = await setDiscordFeedChannel(guildId, feedType, channelId);
    if (!ok) {
      return NextResponse.json({ error: "not_tracked" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      feeds: await listServerFeedSummaries(guildId),
    });
  }

  if (action === "filters") {
    const feedType = feedTypeFrom(body.feed);
    if (!feedType) {
      return NextResponse.json({ error: "invalid_feed" }, { status: 400 });
    }
    const contentTypes = Array.isArray(body.contentTypes)
      ? body.contentTypes.filter((value): value is string => typeof value === "string")
      : undefined;
    const ok = await patchDiscordFeedFilters(guildId, feedType, {
      minFame: typeof body.minFame === "number" ? body.minFame : body.minFame === null ? null : undefined,
      minSilver:
        typeof body.minSilver === "number"
          ? body.minSilver
          : body.minSilver === null
            ? null
            : undefined,
      contentTypes: contentTypes === undefined ? undefined : contentTypes,
      paused: typeof body.paused === "boolean" ? body.paused : undefined,
      minPlayers:
        typeof body.minPlayers === "number"
          ? body.minPlayers
          : body.minPlayers === null
            ? null
            : undefined,
      createThread:
        typeof body.createThread === "boolean" ? body.createThread : undefined,
    });
    if (!ok) {
      return NextResponse.json({ error: "not_tracked" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      feeds: await listServerFeedSummaries(guildId),
    });
  }

  if (action === "ping-role") {
    const feedType = feedTypeFrom(body.feed);
    const roleId =
      typeof body.roleId === "string"
        ? body.roleId
        : body.roleId === null
          ? null
          : "";
    if (!feedType) {
      return NextResponse.json({ error: "invalid_feed" }, { status: 400 });
    }
    if (roleId) {
      const roles = await listGuildRoles(guildId);
      if (!roles.ok || !roles.roles.some((role) => role.id === roleId)) {
        return NextResponse.json({ error: "invalid_role" }, { status: 400 });
      }
    }
    const ok = await patchDiscordFeedFilters(guildId, feedType, {
      pingRoleId: roleId || null,
    });
    if (!ok) {
      return NextResponse.json({ error: "not_tracked" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      feeds: await listServerFeedSummaries(guildId),
    });
  }

  if (action === "test-post") {
    const feedType = feedTypeFrom(body.feed);
    if (!feedType) {
      return NextResponse.json({ error: "invalid_feed" }, { status: 400 });
    }
    const feeds = await listServerFeedSummaries(guildId);
    const feed = feeds.find((row) => row.feedType === feedType);
    if (!feed?.channelId) {
      return NextResponse.json({ error: "no_channel" }, { status: 400 });
    }
    if (feedType === FEED_GUILD_BATTLES) {
      const existingMessageId = await getDiscordPreviewMessageId(feed.id);
      const posted = await postOrEditBattlePreviewMessage({
        channelId: feed.channelId,
        region: feed.region,
        trackedGuildName: feed.targetName ?? "Your guild",
        existingMessageId,
      });
      if (!posted.ok) {
        return NextResponse.json(
          { error: "post_failed" },
          { status: posted.status === 503 ? 503 : 502 }
        );
      }
      await recordDiscordPreviewMessage(feed.id, posted.messageId);
      return NextResponse.json({ ok: true, edited: posted.edited });
    }
    const posted = await postTestMessage(feed.channelId);
    if (!posted.ok) {
      return NextResponse.json(
        { error: "post_failed" },
        { status: posted.status === 503 ? 503 : 502 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
