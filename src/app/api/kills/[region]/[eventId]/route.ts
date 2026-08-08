import { NextResponse } from "next/server";
import { getKillEvent } from "@/lib/db/queries";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ region: string; eventId: string }> }
) {
  const { region, eventId } = await params;

  if (!isRegionEnabled(region)) {
    return NextResponse.json({ error: "Region disabled" }, { status: 404 });
  }

  try {
    const event = await getKillEvent(
      region as AlbionRegion,
      parseInt(eventId, 10)
    );
    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch kill" },
      { status: 500 }
    );
  }
}
