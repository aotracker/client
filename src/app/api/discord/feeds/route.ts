import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
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

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getDiscordAccessTokenForUser(session.user.id);
  if (!token.ok) {
    return NextResponse.json(
      { error: token.reason },
      { status: token.reason === "not_linked" ? 403 : 401 }
    );
  }

  const guilds = await fetchDiscordUserGuilds(token.token);
  if (guilds === "unauthorized") {
    return NextResponse.json({ error: "needs_reauth" }, { status: 401 });
  }
  if (guilds === "rate_limited") {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

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

  return NextResponse.json({
    inviteUrl,
    botTokenConfigured: Boolean(process.env.DISCORD_BOT_TOKEN?.trim()),
    guilds: servers,
  });
}
