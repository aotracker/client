export const FEED_GUILD_KILLS = "guild_kills";
export const FEED_GUILD_DEATHS = "guild_deaths";
export const FEED_GUILD_BATTLES = "guild_battles";

export const GUILD_FEED_TYPES = [
  FEED_GUILD_KILLS,
  FEED_GUILD_DEATHS,
  FEED_GUILD_BATTLES,
] as const;

export type DiscordFeedType = (typeof GUILD_FEED_TYPES)[number];

/** Default battle size floor when minPlayers is unset. */
export const DEFAULT_BATTLE_FEED_MIN_PLAYERS = 20;
export const MAX_BATTLE_FEED_MIN_PLAYERS = 500;

export type DiscordFeedFilters = {
  minFame?: number;
  minSilver?: number;
  contentTypes?: string[];
  pingRoleId?: string;
  paused?: boolean;
  notifyAfter?: string;
  /** Post guild battle summaries only when totalPlayers >= this. */
  minPlayers?: number;
  /** Start a Discord thread on the first battle summary message. */
  createThread?: boolean;
};

export type FeedSummary = {
  id: string;
  feedType: DiscordFeedType;
  targetName: string | null;
  targetAlbionId: string;
  region: "americas" | "europe" | "asia";
  channelId: string | null;
  enabled: number;
  filters: DiscordFeedFilters;
  lastPostedAt: string | null;
};

export function isDiscordFeedType(value: string): value is DiscordFeedType {
  return (GUILD_FEED_TYPES as readonly string[]).includes(value);
}

export function clampBattleMinPlayers(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BATTLE_FEED_MIN_PLAYERS;
  return Math.min(
    MAX_BATTLE_FEED_MIN_PLAYERS,
    Math.max(1, Math.floor(value))
  );
}

export function battlePreviewEventKey(feedId: string): string {
  return `battle-preview:${feedId}`;
}
