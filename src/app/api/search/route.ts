import { NextResponse } from "next/server";
import { searchLocal } from "@/lib/db/queries";
import {
  getAlbionClient,
  PAGE_LOAD_REQUEST_OPTIONS,
} from "@/lib/albion/client";
import {
  getDefaultRegion,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";

const EMPTY_LOCAL = {
  players: [],
  guilds: [],
  alliances: [],
};

function formatRouteError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message) return error.message;
    if (error.name === "AggregateError") {
      const nested = (error as AggregateError).errors?.[0];
      if (nested instanceof Error && nested.message) return nested.message;
    }
  }
  return "Search failed";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const requested = searchParams.get("region");
  const region: AlbionRegion = isRegionEnabled(requested ?? "")
    ? (requested as AlbionRegion)
    : getDefaultRegion();
  const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 20)
    : 20;

  if (!q) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  if (requested && requested !== "all" && !isRegionEnabled(requested)) {
    return NextResponse.json({ error: "Region disabled" }, { status: 404 });
  }

  let local = EMPTY_LOCAL;
  let localError: string | null = null;

  try {
    local = await searchLocal(q, limit);
  } catch (error) {
    localError = formatRouteError(error);
    console.warn("[api/search] local search failed:", localError);
  }

  let live = { players: [] as unknown[], guilds: [] as unknown[] };
  let liveError: string | null = null;

  if (isRegionEnabled(region)) {
    try {
      const client = getAlbionClient();
      live = await client.search(region, q, PAGE_LOAD_REQUEST_OPTIONS);
      if (Array.isArray(live.players)) {
        live.players = live.players.slice(0, limit);
      }
      if (Array.isArray(live.guilds)) {
        live.guilds = live.guilds.slice(0, limit);
      }
    } catch (e) {
      liveError = formatRouteError(e);
    }
  }

  // Degrade gracefully when Postgres is down but gameinfo is reachable.
  if (localError && !liveError && live.players.length + live.guilds.length > 0) {
    return NextResponse.json({ local, live, liveError, localError });
  }

  if (localError && liveError) {
    return NextResponse.json(
      { error: localError, localError, liveError },
      { status: 503 }
    );
  }

  return NextResponse.json({ local, live, liveError, localError });
}
