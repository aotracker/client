import { canManageDiscordGuild } from "@/lib/discord-permissions";
import { discordInviteUrl } from "@/lib/discord-invite";
import {
  isDiscordServerInstalled,
  listServerFeedSummaries,
} from "@/lib/discord-feed-settings";
import {
  fetchDiscordUserGuilds,
  getDiscordAccessTokenForUser,
} from "@/lib/discord-user-oauth";
import { botIsInGuild } from "@/lib/discord-bot-api";
import type { FeedSummary } from "@/lib/discord-feed-types";

export type DiscordFeedsGuildListItem = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  botInstalled: boolean;
  feeds: FeedSummary[];
};

export type DiscordFeedsListOk = {
  ok: true;
  inviteUrl: string | null;
  botTokenConfigured: boolean;
  guilds: DiscordFeedsGuildListItem[];
};

export type DiscordFeedsListErr = {
  ok: false;
  error: "not_linked" | "needs_reauth" | "rate_limited" | "load_error";
};

export type DiscordFeedsListResult = DiscordFeedsListOk | DiscordFeedsListErr;

export async function getDiscordFeedsList(
  userId: string
): Promise<DiscordFeedsListResult> {
  const token = await getDiscordAccessTokenForUser(userId);
  if (!token.ok) {
    return {
      ok: false,
      error: token.reason === "not_linked" ? "not_linked" : "needs_reauth",
    };
  }

  const guilds = await fetchDiscordUserGuilds(token.token);
  if (guilds === "unauthorized") {
    return { ok: false, error: "needs_reauth" };
  }
  if (guilds === "rate_limited") {
    return { ok: false, error: "rate_limited" };
  }

  try {
    const manageable = guilds.filter((guild) => canManageDiscordGuild(guild));
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID?.trim();
    const inviteUrl = clientId ? discordInviteUrl(clientId) : null;

    const servers = await Promise.all(
      manageable.map(async (guild) => {
        const dbInstalled = await isDiscordServerInstalled(guild.id);
        const botInstalled = dbInstalled || (await botIsInGuild(guild.id));
        const feeds = await listServerFeedSummaries(guild.id);
        return {
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
          botInstalled,
          feeds,
        };
      })
    );

    return {
      ok: true,
      inviteUrl,
      botTokenConfigured: Boolean(process.env.DISCORD_BOT_TOKEN?.trim()),
      guilds: servers,
    };
  } catch {
    return { ok: false, error: "load_error" };
  }
}
