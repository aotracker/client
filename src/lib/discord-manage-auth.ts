import { getSession } from "@/lib/auth";
import { canManageDiscordGuild } from "@/lib/discord-permissions";
import {
  fetchDiscordUserGuilds,
  getDiscordAccessTokenForUser,
  type DiscordUserGuild,
} from "@/lib/discord-user-oauth";

export type ManageAuthFailure = {
  ok: false;
  status: number;
  error: string;
};

export type ManageAuthSuccess = {
  ok: true;
  userId: string;
  guild: DiscordUserGuild;
};

export async function requireDiscordManageGuild(
  guildId: string
): Promise<ManageAuthSuccess | ManageAuthFailure> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const token = await getDiscordAccessTokenForUser(session.user.id);
  if (!token.ok) {
    return {
      ok: false,
      status: token.reason === "not_linked" ? 403 : 401,
      error: token.reason,
    };
  }

  const guilds = await fetchDiscordUserGuilds(token.token);
  if (guilds === "unauthorized") {
    return { ok: false, status: 401, error: "needs_reauth" };
  }
  if (guilds === "rate_limited") {
    return { ok: false, status: 429, error: "rate_limited" };
  }

  const guild = guilds.find((row) => row.id === guildId);
  if (!guild || !canManageDiscordGuild(guild)) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return { ok: true, userId: session.user.id, guild };
}
