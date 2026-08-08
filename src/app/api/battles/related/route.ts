import { NextResponse } from "next/server";
import { getRelatedBattlesFeed } from "@/lib/db/queries";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionParam = searchParams.get("region");
  const idsParam = searchParams.get("ids") ?? "";
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "5", 10) || 5, 1),
    10
  );

  if (!regionParam || !isRegionEnabled(regionParam)) {
    return NextResponse.json({ error: "Valid region required" }, { status: 400 });
  }

  const selectedIds = idsParam
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));

  if (selectedIds.length === 0) {
    return NextResponse.json({ battles: [] });
  }

  try {
    const battles = await getRelatedBattlesFeed({
      region: regionParam as AlbionRegion,
      selectedIds,
      limit,
    });
    return NextResponse.json({ battles });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch related battles",
      },
      { status: 500 }
    );
  }
}
