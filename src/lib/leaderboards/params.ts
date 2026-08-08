import type { ContentTypeFilter } from "@/lib/db/queries";

export const LEADERBOARD_TABS = [
  "killers",
  "guilds",
  "kills",
  "fame",
] as const;

export type LeaderboardTab = (typeof LEADERBOARD_TABS)[number];

export const LEADERBOARD_TAB_META: Record<
  LeaderboardTab,
  { label: string; description: string }
> = {
  killers: {
    label: "Top Killers",
    description: "Players ranked by number of kills",
  },
  guilds: {
    label: "Top Guilds",
    description: "Guilds ranked by total kill fame",
  },
  kills: {
    label: "Top Kills",
    description: "Highest fame individual kills",
  },
  fame: {
    label: "Top Fame",
    description: "Players ranked by kill fame earned",
  },
};

export function parseLeaderboardTab(value: string | undefined): LeaderboardTab {
  if (value && LEADERBOARD_TABS.includes(value as LeaderboardTab)) {
    return value as LeaderboardTab;
  }
  return "killers";
}

export function parseLeaderboardDays(value: string | undefined): number {
  const parsed = Number(value);
  if (parsed === 14 || parsed === 30) return parsed;
  return 7;
}

export function parseLeaderboardContentType(
  value: string | undefined
): ContentTypeFilter {
  if (value === "SOLO" || value === "GROUP" || value === "ZVZ") return value;
  return "all";
}
