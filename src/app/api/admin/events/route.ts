import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";
import {
  getOpsEvents,
  parseOpsEventsQueryParams,
} from "@/lib/ops/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = parseOpsEventsQueryParams(url.searchParams);
  const result = await getOpsEvents(query);
  return NextResponse.json(result);
}
