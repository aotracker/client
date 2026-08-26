import { createBattleOgImage } from "@/lib/og";
import {
  battlePreviewOgInput,
  buildBattlePreviewMessageBody,
} from "./discord-battle-preview";

const DISCORD_API = "https://discord.com/api/v10";
const USER_AGENT = "AOTracker (https://www.aotracker.net)";

const GUILD_TEXT = 0;
const GUILD_ANNOUNCEMENT = 5;

export type DiscordTextChannel = {
  id: string;
  name: string;
  type: number;
};

export type DiscordRole = {
  id: string;
  name: string;
  managed: boolean;
};

export type DiscordChannelsResult =
  | { ok: true; channels: DiscordTextChannel[] }
  | {
      ok: false;
      reason: "missing_token" | "bot_not_in_guild" | "forbidden" | "discord_error";
      status?: number;
    };

export type DiscordRolesResult =
  | { ok: true; roles: DiscordRole[] }
  | {
      ok: false;
      reason: "missing_token" | "bot_not_in_guild" | "forbidden" | "discord_error";
      status?: number;
    };

export function discordBotToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN?.trim() || null;
}

function botHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bot ${token}`,
    "User-Agent": USER_AGENT,
  };
}

export async function botIsInGuild(guildId: string): Promise<boolean> {
  const token = discordBotToken();
  if (!token) return false;
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=false`, {
    headers: botHeaders(token),
    cache: "no-store",
  });
  return res.ok;
}

export async function listGuildTextChannels(
  guildId: string
): Promise<DiscordChannelsResult> {
  const token = discordBotToken();
  if (!token) return { ok: false, reason: "missing_token" };
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: botHeaders(token),
    cache: "no-store",
  });
  if (res.status === 403 || res.status === 404) {
    return { ok: false, reason: "bot_not_in_guild", status: res.status };
  }
  if (res.status === 401) {
    return { ok: false, reason: "forbidden", status: res.status };
  }
  if (!res.ok) {
    return { ok: false, reason: "discord_error", status: res.status };
  }
  const data = (await res.json()) as Array<{
    id?: string;
    name?: string;
    type?: number;
  }>;
  const channels = data
    .filter(
      (channel) =>
        typeof channel.id === "string" &&
        typeof channel.name === "string" &&
        (channel.type === GUILD_TEXT || channel.type === GUILD_ANNOUNCEMENT)
    )
    .map((channel) => ({
      id: channel.id as string,
      name: channel.name as string,
      type: channel.type as number,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, channels };
}

export async function listGuildRoles(
  guildId: string
): Promise<DiscordRolesResult> {
  const token = discordBotToken();
  if (!token) return { ok: false, reason: "missing_token" };
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: botHeaders(token),
    cache: "no-store",
  });
  if (res.status === 403 || res.status === 404) {
    return { ok: false, reason: "bot_not_in_guild", status: res.status };
  }
  if (res.status === 401) {
    return { ok: false, reason: "forbidden", status: res.status };
  }
  if (!res.ok) {
    return { ok: false, reason: "discord_error", status: res.status };
  }
  const data = (await res.json()) as Array<{
    id?: string;
    name?: string;
    managed?: boolean;
  }>;
  const roles = data
    .filter(
      (role) =>
        typeof role.id === "string" &&
        typeof role.name === "string" &&
        role.name !== "@everyone"
    )
    .map((role) => ({
      id: role.id as string,
      name: role.name as string,
      managed: Boolean(role.managed),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, roles };
}

export async function postTestMessage(
  channelId: string
): Promise<{ ok: true; messageId: string | null } | { ok: false; status: number }> {
  const token = discordBotToken();
  if (!token) return { ok: false, status: 503 };
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      ...botHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: "AOTracker can post in this channel.",
    }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = (await res.json()) as { id?: string };
  return { ok: true, messageId: typeof data.id === "string" ? data.id : null };
}

async function battlePreviewPng(input: {
  region: string;
  trackedGuildName: string;
}): Promise<Buffer | null> {
  try {
    const image = createBattleOgImage(battlePreviewOgInput(input));
    return Buffer.from(await image.arrayBuffer());
  } catch (err) {
    console.warn(
      "[discord] battle preview image skipped:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

function battlePreviewFormData(
  body: ReturnType<typeof buildBattlePreviewMessageBody>,
  png: Buffer | null
): FormData {
  const payload = structuredClone(body);
  if (png) {
    payload.embeds[0] = {
      ...payload.embeds[0],
      image: { url: "attachment://battle.png" },
    };
    Object.assign(payload, {
      attachments: [{ id: 0, filename: "battle.png" }],
    });
  }
  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  if (png) {
    form.append(
      "files[0]",
      new Blob([new Uint8Array(png)], { type: "image/png" }),
      "battle.png"
    );
  }
  return form;
}

export async function postOrEditBattlePreviewMessage(input: {
  channelId: string;
  region: string;
  trackedGuildName: string;
  existingMessageId?: string | null;
}): Promise<
  | { ok: true; messageId: string | null; edited: boolean }
  | { ok: false; status: number }
> {
  const token = discordBotToken();
  if (!token) return { ok: false, status: 503 };
  const body = buildBattlePreviewMessageBody({
    region: input.region,
    trackedGuildName: input.trackedGuildName,
  });
  const png = await battlePreviewPng({
    region: input.region,
    trackedGuildName: input.trackedGuildName,
  });
  const form = battlePreviewFormData(body, png);
  const headers = botHeaders(token);

  if (input.existingMessageId) {
    const edited = await fetch(
      `${DISCORD_API}/channels/${input.channelId}/messages/${input.existingMessageId}`,
      { method: "PATCH", headers, body: form }
    );
    if (edited.ok) {
      return { ok: true, messageId: input.existingMessageId, edited: true };
    }
    if (edited.status !== 404) return { ok: false, status: edited.status };
  }

  const res = await fetch(`${DISCORD_API}/channels/${input.channelId}/messages`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = (await res.json()) as { id?: string };
  return {
    ok: true,
    messageId: typeof data.id === "string" ? data.id : null,
    edited: false,
  };
}
