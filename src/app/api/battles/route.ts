import { NextResponse } from "next/server";
import { countBattlesFeed, getBattlesFeed } from "@/lib/db/queries";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionParam = searchParams.get("region") ?? "all";
  const q = searchParams.get("q")?.trim() || undefined;
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
    50
  );
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

  if (regionParam !== "all" && !isRegionEnabled(regionParam)) {
    return NextResponse.json({ error: "Region disabled" }, { status: 404 });
  }

  const region = regionParam as AlbionRegion | "all";

  try {
    const [battles, total] = await Promise.all([
      getBattlesFeed({ region, q, limit, offset }),
      countBattlesFeed({ region, q }),
    ]);
    return NextResponse.json({ battles, total });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch battles" },
      { status: 500 }
    );
  }
}
