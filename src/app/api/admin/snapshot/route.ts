import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-route";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { buildAdminSnapshot } from "@/lib/ops/admin-snapshot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const snapshot = await buildAdminSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Snapshot unavailable",
      },
      { status: 500 }
    );
  }
}
