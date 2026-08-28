import { NextResponse } from "next/server";
import { requireUser, parseJsonBody } from "@/lib/api-route";
import {
  getUserPreferredRegion,
  getUserRecentSearches,
  getUserWatchlist,
  mergeRecentSearches,
  mergeWatchlistEntries,
  replaceUserRecentSearches,
  replaceUserWatchlist,
  setUserPreferredRegion,
} from "@/lib/db/user-data";
import type { WatchlistEntry } from "@/lib/watchlist";
import type { RecentSearch } from "@/lib/search/recent-searches";
import { isPreferredRegion } from "@/lib/region-preference";

/** Union-merge browser localStorage payload into the signed-in user's server prefs. */
export async function POST(request: Request) {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody<{
    watchlist?: WatchlistEntry[];
    recentSearches?: RecentSearch[];
    preferredRegion?: string | null;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const userId = authz.userId;
  const [serverWatchlist, serverRecent, serverRegion] = await Promise.all([
    getUserWatchlist(userId),
    getUserRecentSearches(userId),
    getUserPreferredRegion(userId),
  ]);

  const watchlist = Array.isArray(body.watchlist)
    ? await replaceUserWatchlist(
        userId,
        mergeWatchlistEntries(serverWatchlist, body.watchlist)
      )
    : serverWatchlist;

  const recentSearches = Array.isArray(body.recentSearches)
    ? await replaceUserRecentSearches(
        userId,
        mergeRecentSearches(serverRecent, body.recentSearches)
      )
    : serverRecent;

  let preferredRegion = serverRegion;
  if (
    typeof body.preferredRegion === "string" &&
    isPreferredRegion(body.preferredRegion)
  ) {
    preferredRegion = serverRegion
      ? serverRegion
      : await setUserPreferredRegion(userId, body.preferredRegion);
  }

  return NextResponse.json({ watchlist, recentSearches, preferredRegion });
}
