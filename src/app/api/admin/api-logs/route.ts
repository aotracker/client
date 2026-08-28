import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-route";
import { verifyAdminRequest } from "@/lib/auth/admin";
import {
  getApiRequestLogs,
  parseApiLogsQueryParams,
} from "@/lib/ops/api-log-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const query = parseApiLogsQueryParams(url.searchParams);
  const result = await getApiRequestLogs(query);
  return NextResponse.json(result);
}
