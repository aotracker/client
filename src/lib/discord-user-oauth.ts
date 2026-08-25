import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const DISCORD_API = "https://discord.com/api/v10";
const USER_AGENT = "AOTracker (https://www.aotracker.net)";

export type DiscordUserGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

type TokenResult =
  | { ok: true; token: string; scope: string | null }
  | { ok: false; reason: "not_linked" | "needs_reauth" };

export async function getDiscordAccessTokenForUser(
  userId: string
): Promise<TokenResult> {
  const [account] = await db
    .select()
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, "discord")
      )
    )
    .limit(1);
  if (!account) return { ok: false, reason: "not_linked" };

  const now = Date.now();
  const expires = account.accessTokenExpiresAt?.getTime() ?? 0;
  if (account.accessToken && (expires === 0 || expires > now + 60_000)) {
    return { ok: true, token: account.accessToken, scope: account.scope };
  }

  if (!account.refreshToken) {
    if (account.accessToken) {
      return { ok: true, token: account.accessToken, scope: account.scope };
    }
    return { ok: false, reason: "needs_reauth" };
  }

  const refreshed = await refreshDiscordToken(account.refreshToken);
  if (!refreshed) return { ok: false, reason: "needs_reauth" };

  await db
    .update(schema.account)
    .set({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? account.refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      scope: refreshed.scope ?? account.scope,
      updatedAt: new Date(),
    })
    .where(eq(schema.account.id, account.id));

  return {
    ok: true,
    token: refreshed.access_token,
    scope: refreshed.scope ?? account.scope,
  };
}

export function discordScopeIncludesGuilds(scope: string | null | undefined): boolean {
  if (!scope) return false;
  return scope.split(/[\s,]+/).includes("guilds");
}

const GUILDS_CACHE_TTL_MS = 60_000;
const guildsCache = new Map<
  string,
  { at: number; guilds: DiscordUserGuild[] }
>();

function cacheKeyForToken(accessToken: string): string {
  // Avoid storing the full bearer token as a map key in logs/heaps longer than needed.
  return accessToken.slice(0, 12) + ":" + accessToken.length;
}

function readGuildsCache(accessToken: string): DiscordUserGuild[] | null {
  const entry = guildsCache.get(cacheKeyForToken(accessToken));
  if (!entry) return null;
  if (Date.now() - entry.at > GUILDS_CACHE_TTL_MS) return null;
  return entry.guilds;
}

function readGuildsCacheStale(accessToken: string): DiscordUserGuild[] | null {
  return guildsCache.get(cacheKeyForToken(accessToken))?.guilds ?? null;
}

function writeGuildsCache(accessToken: string, guilds: DiscordUserGuild[]) {
  guildsCache.set(cacheKeyForToken(accessToken), {
    at: Date.now(),
    guilds,
  });
}

export type FetchDiscordUserGuildsResult =
  | DiscordUserGuild[]
  | "unauthorized"
  | "rate_limited";

export async function fetchDiscordUserGuilds(
  accessToken: string
): Promise<FetchDiscordUserGuildsResult> {
  const cached = readGuildsCache(accessToken);
  if (cached) return cached;

  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) return "unauthorized";
  if (res.status === 429) {
    // Prefer any previously fetched list over failing the page hard.
    const stale = readGuildsCacheStale(accessToken);
    if (stale) return stale;
    return "rate_limited";
  }
  if (!res.ok) {
    throw new Error(`Discord guilds request failed (${res.status})`);
  }
  const data = (await res.json()) as Array<{
    id?: string;
    name?: string;
    icon?: string | null;
    owner?: boolean;
    permissions?: string;
  }>;
  const guilds = data
    .filter((guild) => typeof guild.id === "string")
    .map((guild) => ({
      id: guild.id as string,
      name: typeof guild.name === "string" ? guild.name : guild.id!,
      icon: typeof guild.icon === "string" ? guild.icon : null,
      owner: Boolean(guild.owner),
      permissions: typeof guild.permissions === "string" ? guild.permissions : "0",
    }));
  writeGuildsCache(accessToken, guilds);
  return guilds;
}

async function refreshDiscordToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
} | null> {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!data.access_token || !data.expires_in) return null;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    scope: data.scope,
  };
}
