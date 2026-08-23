"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
  getRecentSearches,
  pushRecentSearch as pushLocalRecentSearch,
  type RecentSearch,
} from "@/lib/search/recent-searches";
import { PREFS_SYNC_FLAG_PREFIX } from "@/components/watchlist/useWatchlist";

async function fetchRecentFromServer(): Promise<RecentSearch[]> {
  const res = await fetch("/api/user/prefs");
  if (!res.ok) return getRecentSearches();
  const data = (await res.json()) as { recentSearches?: RecentSearch[] };
  return data.recentSearches ?? [];
}

async function putRecentOnServer(entries: RecentSearch[]) {
  await fetch("/api/user/prefs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recentSearches: entries }),
  });
}

/**
 * Dual-mode recent searches: localStorage when anonymous, server prefs when signed in.
 * First-login merge is handled by useWatchlist's sync-local call (shared flag).
 */
export function useRecentSearches() {
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user?.id ?? null;
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRecent(getRecentSearches());
      setReady(true);
      return;
    }
    try {
      const entries = await fetchRecentFromServer();
      setRecent(entries);
    } catch {
      setRecent(getRecentSearches());
    } finally {
      setReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (sessionPending) return;
    setReady(false);
    void refresh();
  }, [userId, sessionPending, refresh]);

  const push = useCallback(
    (entry: Omit<RecentSearch, "ts"> & { ts?: number }) => {
      if (!userId) {
        pushLocalRecentSearch(entry);
        setRecent(getRecentSearches());
        return;
      }

      const next: RecentSearch = {
        ...entry,
        q: entry.q.trim(),
        ts: entry.ts ?? Date.now(),
      };
      if (!next.q && !next.path) return;

      setRecent((prev) => {
        const filtered = prev.filter((item) => {
          if (next.path && item.path) return item.path !== next.path;
          return !(item.q === next.q && item.region === next.region);
        });
        const merged = [next, ...filtered].slice(0, 8);
        void putRecentOnServer(merged);
        return merged;
      });
    },
    [userId]
  );

  return {
    recent,
    ready,
    push,
    refresh,
    signedIn: Boolean(userId),
    syncFlagPrefix: PREFS_SYNC_FLAG_PREFIX,
  };
}
