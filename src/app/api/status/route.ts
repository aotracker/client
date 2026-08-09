import { NextResponse } from "next/server";
import { getApiSyncState, getGlobalSyncStatus } from "@/lib/db/queries";
import { getRegionHealthMetrics } from "@/lib/db/api-state";
import { ENABLED_REGIONS, type AlbionRegion } from "@/lib/albion/types";
import { getEnrichedQueueStatuses } from "@/lib/jobs/queue";
import { getCronJobStatuses } from "@/lib/jobs/cron-state";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [syncStates, globalStatus, queues, crons, healthMetrics] =
      await Promise.all([
        getApiSyncState(),
        getGlobalSyncStatus(),
        getEnrichedQueueStatuses(),
        getCronJobStatuses(),
        Promise.all(
          ENABLED_REGIONS.map(async (region) => [
            region,
            await getRegionHealthMetrics(region),
          ] as const)
        ).then((entries) => Object.fromEntries(entries) as Record<
          AlbionRegion,
          Awaited<ReturnType<typeof getRegionHealthMetrics>>
        >),
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
