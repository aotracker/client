import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";
import { getQueueStatuses } from "@/lib/jobs/queue";

export const dynamic = "force-dynamic";

/**
 * Emergency ops endpoint: returns BullMQ queue snapshot from ingest HTTP API.
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await getQueueStatuses();
    return NextResponse.json({
      ok: true,
      task: "process-jobs",
      ...snapshot,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Queue status failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
