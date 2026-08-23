import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { getEnrichedQueueStatuses } from "@/lib/jobs/queue";
import { getEnrichedWorkerJobStatuses } from "@/lib/jobs/worker-status";

export const dynamic = "force-dynamic";

/** Lightweight poll endpoint for worker queue panel. */
export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [queues, crons] = await Promise.all([
      getEnrichedQueueStatuses(),
      getEnrichedWorkerJobStatuses(),
    ]);
    return NextResponse.json({
      queues,
      crons: {
        jobs: crons.jobs,
        connectivity: crons.connectivity,
        health: crons.health,
        fetchedAt: crons.fetchedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Queue status failed",
      },
      { status: 500 }
    );
  }
}
