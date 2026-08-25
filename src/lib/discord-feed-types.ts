export const FEED_GUILD_KILLS = "guild_kills";
export const FEED_GUILD_DEATHS = "guild_deaths";

export type DiscordFeedType = typeof FEED_GUILD_KILLS | typeof FEED_GUILD_DEATHS;

export type DiscordFeedFilters = {
  minFame?: number;
  minSilver?: number;
  contentTypes?: string[];
  pingRoleId?: string;
  paused?: boolean;
  notifyAfter?: string;
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
