import { NextResponse } from "next/server";
import { requireUser, parseJsonBody, jsonError } from "@/lib/api-route";
import {
  getUserPreferredRegion,
  getUserRecentSearches,
  getUserWatchlist,
  replaceUserRecentSearches,
  replaceUserWatchlist,
  setUserPreferredRegion,
} from "@/lib/db/user-data";
import type { WatchlistEntry } from "@/lib/watchlist";
import type { RecentSearch } from "@/lib/search/recent-searches";
import { isPreferredRegion } from "@/lib/region-preference";

export async function GET() {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const [watchlist, recentSearches, preferredRegion] = await Promise.all([
    getUserWatchlist(authz.userId),
    getUserRecentSearches(authz.userId),
    getUserPreferredRegion(authz.userId),
  ]);

  return NextResponse.json({ watchlist, recentSearches, preferredRegion });
}

export async function PUT(request: Request) {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody<{
    watchlist?: WatchlistEntry[];
    recentSearches?: RecentSearch[];
    preferredRegion?: string | null;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const result: {
    watchlist?: WatchlistEntry[];
    recentSearches?: RecentSearch[];
    preferredRegion?: string | null;
  } = {};

  if (Array.isArray(body.watchlist)) {
    result.watchlist = await replaceUserWatchlist(authz.userId, body.watchlist);
  }
  if (Array.isArray(body.recentSearches)) {
    result.recentSearches = await replaceUserRecentSearches(
      authz.userId,
      body.recentSearches
    );
  }
  if (body.preferredRegion !== undefined) {
    const next =
      body.preferredRegion === null || body.preferredRegion === ""
        ? null
        : isPreferredRegion(body.preferredRegion)
          ? body.preferredRegion
          : null;
    if (
      body.preferredRegion !== null &&
      body.preferredRegion !== "" &&
      next === null
    ) {
      return jsonError("Invalid preferredRegion", 400);
    }
    result.preferredRegion = await setUserPreferredRegion(authz.userId, next);
  }

  return NextResponse.json(result);
}
