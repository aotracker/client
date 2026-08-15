import type { PreferredRegion } from "@/lib/region-preference";

const RECENT_KEY = "aotrackr:recent-searches";
const MAX_RECENT = 8;

export type RecentSearch = {
  q: string;
  region: PreferredRegion;
  type?: "player" | "guild" | "alliance" | "path" | "query";
  path?: string;
  ts: number;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getRecentSearches(): RecentSearch[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearch[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentSearch(
  entry: Omit<RecentSearch, "ts"> & { ts?: number }
): void {
  if (!canUseStorage()) return;
  try {
    const next: RecentSearch = {
      ...entry,
      q: entry.q.trim(),
      ts: entry.ts ?? Date.now(),
    };
    if (!next.q && !next.path) return;

    const prev = getRecentSearches().filter((item) => {
      if (next.path && item.path) return item.path !== next.path;
      return !(item.q === next.q && item.region === next.region);
    });
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([next, ...prev].slice(0, MAX_RECENT))
    );
  } catch {
    // ignore quota / private mode
  }
}
