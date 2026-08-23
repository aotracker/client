import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { triggerSchedulerJob } from "@/lib/ingest-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = await triggerSchedulerJob("health-check");
  if (!jobId) {
    return NextResponse.json(
      { error: "Failed to trigger health check — check INGEST_API_URL" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, jobId });
}
