import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";
import { getEnrichedQueueStatuses } from "@/lib/jobs/queue";
import { getCronJobStatuses } from "@/lib/jobs/cron-state";

export const dynamic = "force-dynamic";

/** Lightweight poll endpoint for worker queue panel. */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [queues, crons] = await Promise.all([
      getEnrichedQueueStatuses(),
      getCronJobStatuses(),
    ]);
    return NextResponse.json({ queues, crons });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Queue status failed",
      },
      { status: 500 }
    );
  }
}
