export const DISCORD_BOT_JOB_KEY = "discord-bot";
export const DISCORD_BOT_ALIVE_MS = 90_000;

export type DiscordBotDisplayStatus =
  | "online"
  | "error"
  | "down"
  | "unknown";

export type DiscordBotStatus = {
  displayStatus: DiscordBotDisplayStatus;
  isAlive: boolean;
  hasActiveError: boolean;
  lastHeartbeatAt: string | null;
  lastErrorMessage: string | null;
  tag: string | null;
  userId: string | null;
  gatewayGuilds: number | null;
  ping: number | null;
  servers: number;
  activeServers: number;
  enabledFeeds: number;
  feedsWithChannel: number;
  lastPostAt: string | null;
  postsLastHour: number;
  fetchedAt: string;
};

export function emptyDiscordBotStatus(): DiscordBotStatus {
  return {
    displayStatus: "unknown",
    isAlive: false,
    hasActiveError: false,
    lastHeartbeatAt: null,
    lastErrorMessage: null,
    tag: null,
    userId: null,
    gatewayGuilds: null,
    ping: null,
    servers: 0,
    activeServers: 0,
    enabledFeeds: 0,
    feedsWithChannel: 0,
    lastPostAt: null,
    postsLastHour: 0,
    fetchedAt: new Date().toISOString(),
  };
}
