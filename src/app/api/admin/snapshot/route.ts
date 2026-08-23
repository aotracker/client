import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { buildAdminSnapshot } from "@/lib/ops/admin-snapshot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
