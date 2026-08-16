import { NextResponse } from "next/server";
import { getKillFeed, resolveWatchlistKillFeed } from "@/lib/db/queries";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import {
  parseMinFame,
  parseWatchlistRefs,
} from "@/lib/kills-feed-params";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionParam = searchParams.get("region") ?? "all";
  const contentType = searchParams.get("type") ?? "all";
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const after = searchParams.get("after") ?? undefined;
  const afterEventIdRaw = searchParams.get("afterEventId");
  const afterEventId = afterEventIdRaw
    ? parseInt(afterEventIdRaw, 10)
    : undefined;
  const minFame = parseMinFame(searchParams.get("minFame") ?? undefined);
  const players = parseWatchlistRefs(searchParams.get("players"));
  const guilds = parseWatchlistRefs(searchParams.get("guilds"));
  const alliances = parseWatchlistRefs(searchParams.get("alliances"));
  const watchlistRequested =
    searchParams.has("players") ||
    searchParams.has("guilds") ||
    searchParams.has("alliances");

  if (regionParam !== "all" && !isRegionEnabled(regionParam)) {
    return NextResponse.json({ error: "Region disabled" }, { status: 404 });
  }

  const region = regionParam as AlbionRegion | "all";

  try {
    const watch = watchlistRequested
      ? await resolveWatchlistKillFeed({ players, guilds, alliances })
      : undefined;

    const events = await getKillFeed({
      region,
      contentType: contentType as "all" | "ZVZ" | "SOLO" | "GROUP",
      limit,
      offset,
      after,
      afterEventId:
        afterEventId != null && !Number.isNaN(afterEventId)
          ? afterEventId
          : undefined,
      minFame,
      watch,
    });
    return NextResponse.json(
      { events },
      {
        headers: {
          // Incremental `after` polls and watchlist filters are per-client.
          "Cache-Control":
            after || watchlistRequested
              ? "private, no-store"
              : "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch kills" },
      { status: 500 }
    );
  }
}
