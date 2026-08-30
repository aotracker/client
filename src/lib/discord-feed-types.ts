export {
  FEED_GUILD_BATTLES,
  FEED_GUILD_DEATHS,
  FEED_GUILD_KILLS,
  FEED_GUILD_LIVE,
  GUILD_FEED_TYPES,
  DEFAULT_BATTLE_FEED_MIN_PLAYERS,
  MAX_BATTLE_FEED_MIN_PLAYERS,
  applyFeedFilterPatch,
  battlePreviewEventKey,
  clampBattleMinPlayers,
  isDiscordFeedType,
  parseFeedFilters,
  type DiscordFeedFilters,
  type DiscordFeedType,
  type FeedFilterPatch,
} from "@/lib/discord-feed-shared";
import type {
  DiscordFeedFilters,
  DiscordFeedType,
} from "@/lib/discord-feed-shared";

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
