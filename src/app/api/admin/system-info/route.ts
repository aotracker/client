import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-route";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { getSystemInfoSnapshot } from "@/lib/ops/system-info";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }

  const snapshot = await getSystemInfoSnapshot();
  return NextResponse.json(snapshot);
}
