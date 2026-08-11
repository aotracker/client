import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";
import { getSystemInfoSnapshot } from "@/lib/ops/system-info";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getSystemInfoSnapshot();
  return NextResponse.json(snapshot);
}
