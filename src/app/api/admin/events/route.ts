import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-route";
import { verifyAdminRequest } from "@/lib/auth/admin";
import {
  getOpsEvents,
  parseOpsEventsQueryParams,
} from "@/lib/ops/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const query = parseOpsEventsQueryParams(url.searchParams);
  const result = await getOpsEvents(query);
  return NextResponse.json(result);
}
