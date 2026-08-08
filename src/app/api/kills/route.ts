import { NextResponse } from "next/server";
import { getKillFeed } from "@/lib/db/queries";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";

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

  if (regionParam !== "all" && !isRegionEnabled(regionParam)) {
    return NextResponse.json({ error: "Region disabled" }, { status: 404 });
  }

  const region = regionParam as AlbionRegion | "all";

  try {
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
    });
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch kills" },
      { status: 500 }
    );
  }
}
