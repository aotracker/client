"use client";

import { authClient } from "@/lib/auth-client";
import {
  clearPrefsSyncFlag,
  PREFS_SYNC_FLAG_PREFIX,
} from "@/lib/prefs-sync-flag";
import {
  WATCHLIST_STORAGE_KEY,
  type WatchlistEntry,
} from "@/lib/watchlist";
import {
  setRecentSearches,
  type RecentSearch,
} from "@/lib/search/recent-searches";
import {
  isPreferredRegion,
  setPreferredRegion,
  type PreferredRegion,
} from "@/lib/region-preference";

/** Write server prefs into local anonymous storage (used on sign-out). */
export function snapshotServerPrefsToLocal(data: {
  watchlist?: WatchlistEntry[];
  recentSearches?: RecentSearch[];
  preferredRegion?: string | null;
}) {
  if (typeof window === "undefined") return;
  try {
    if (Array.isArray(data.watchlist)) {
      localStorage.setItem(
        WATCHLIST_STORAGE_KEY,
        JSON.stringify({ entries: data.watchlist })
      );
    }
    if (Array.isArray(data.recentSearches)) {
      setRecentSearches(data.recentSearches);
    }
    if (
      typeof data.preferredRegion === "string" &&
      isPreferredRegion(data.preferredRegion)
    ) {
      setPreferredRegion(data.preferredRegion);
    }
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Sign out: snapshot server prefs into localStorage, clear merge flag,
 * then end the Better Auth session.
 */
export async function signOutWithPrefsSnapshot(userId?: string | null) {
  try {
    const res = await fetch("/api/user/prefs", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        watchlist?: WatchlistEntry[];
        recentSearches?: RecentSearch[];
        preferredRegion?: string | null;
      };
      snapshotServerPrefsToLocal(data);
    }
  } catch {
    // still sign out even if prefs fetch fails
  }

  clearPrefsSyncFlag(userId);
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PREFS_SYNC_FLAG_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }

  await authClient.signOut();
}

/** Apply preferred region from server after login (if present). */
export function applyPreferredRegionFromServer(
  preferredRegion: string | null | undefined
) {
  if (
    typeof preferredRegion === "string" &&
    isPreferredRegion(preferredRegion)
  ) {
    setPreferredRegion(preferredRegion as PreferredRegion);
  }
}

/** Push current device preferred region to the server. */
export async function pushPreferredRegionToServer(
  region: PreferredRegion
): Promise<void> {
  await fetch("/api/user/prefs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferredRegion: region }),
  });
}
