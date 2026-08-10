import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";
import {
  getApiRequestLogs,
  parseApiLogsQueryParams,
} from "@/lib/ops/api-log-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = parseApiLogsQueryParams(url.searchParams);
  const result = await getApiRequestLogs(query);
  return NextResponse.json(result);
}
