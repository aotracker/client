import type { AlbionRegion } from "@/lib/albion/types";

export const WATCHLIST_STORAGE_KEY = "aotrackr-watchlist-v1";

export type WatchlistEntityType = "player" | "guild";

export interface WatchlistEntry {
  type: WatchlistEntityType;
  region: AlbionRegion;
  albionId: string;
  name: string;
  addedAt: string;
}

export interface WatchlistState {
  entries: WatchlistEntry[];
}

export function parseWatchlist(raw: string | null): WatchlistState {
  if (!raw) return { entries: [] };
  try {
    const parsed = JSON.parse(raw) as WatchlistState;
    if (!parsed?.entries || !Array.isArray(parsed.entries)) {
      return { entries: [] };
    }
    return {
      entries: parsed.entries.filter(
        (entry) =>
          entry &&
          (entry.type === "player" || entry.type === "guild") &&
          typeof entry.region === "string" &&
          typeof entry.albionId === "string" &&
          typeof entry.name === "string"
      ),
    };
  } catch {
    return { entries: [] };
  }
}

export function watchlistKey(entry: Pick<WatchlistEntry, "type" | "region" | "albionId">) {
  return `${entry.type}:${entry.region}:${entry.albionId}`;
}

export function entityHref(entry: WatchlistEntry): string {
  return entry.type === "player"
    ? `/player/${entry.region}/${entry.albionId}`
    : `/guild/${entry.region}/${entry.albionId}`;
}
