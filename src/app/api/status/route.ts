import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-route";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";
import { buildAdminSnapshot } from "@/lib/ops/admin-snapshot";

export const dynamic = "force-dynamic";

/** @deprecated Use GET /api/admin/snapshot */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const snapshot = await buildAdminSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status unavailable" },
      { status: 500 }
    );
  }
}
