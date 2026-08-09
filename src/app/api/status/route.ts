import { NextResponse } from "next/server";
import { getApiSyncState, getGlobalSyncStatus } from "@/lib/db/queries";
import { getAlbionClient } from "@/lib/albion/client";
import { getEnrichedQueueStatuses } from "@/lib/jobs/queue";
import { getCronJobStatuses } from "@/lib/jobs/cron-state";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [syncStates, globalStatus, healthMetrics, queues, crons] =
      await Promise.all([
        getApiSyncState(),
        getGlobalSyncStatus(),
        getAlbionClient().getHealthMetrics().catch(() => null),
        getEnrichedQueueStatuses(),
        getCronJobStatuses(),
      ]);

    return NextResponse.json({
      syncStates,
      globalStatus,
      healthMetrics,
      queues,
      crons,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status unavailable" },
      { status: 500 }
    );
  }
}
