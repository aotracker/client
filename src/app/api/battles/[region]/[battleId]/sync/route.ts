import { NextResponse } from "next/server";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import { requeueBattleDetail } from "@/lib/jobs/queue";

interface RouteParams {
  params: Promise<{ region: string; battleId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { region, battleId } = await params;
  if (!isRegionEnabled(region)) {
    return NextResponse.json({ error: "Region disabled" }, { status: 404 });
  }

  const parsed = parseInt(battleId, 10);
  if (Number.isNaN(parsed)) {
    return NextResponse.json({ error: "Invalid battle id" }, { status: 400 });
  }

  await requeueBattleDetail(region as AlbionRegion, parsed);
  return NextResponse.json({ ok: true });
}
