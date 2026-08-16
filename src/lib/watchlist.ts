import type { AlbionRegion } from "@/lib/albion/types";
import { alliancePath, guildPath, playerPath } from "@/lib/seo";

export const WATCHLIST_STORAGE_KEY = "aotrackr-watchlist-v1";

export type WatchlistEntityType = "player" | "guild" | "alliance";

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

const WATCHLIST_TYPES = new Set<WatchlistEntityType>([
  "player",
  "guild",
  "alliance",
]);

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
          WATCHLIST_TYPES.has(entry.type) &&
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
  if (entry.type === "player") return playerPath(entry.region, entry.name);
  if (entry.type === "guild") return guildPath(entry.region, entry.name);
  return alliancePath(entry.region, entry.albionId);
}
