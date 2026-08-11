import {
  getApiSyncState,
  getGlobalSyncStatus,
  getRegionEntityCounts,
} from "@/lib/db/queries";
import { getRegionHealthMetrics } from "@/lib/db/api-state";
import { ENABLED_REGIONS, type AlbionRegion } from "@/lib/albion/types";
import { getEnrichedQueueStatuses } from "@/lib/jobs/queue";
import { getEnrichedWorkerJobStatuses } from "@/lib/jobs/worker-status";

export async function buildAdminSnapshot() {
  const [syncStates, globalStatus, queues, workerStatus, healthMetrics] =
    await Promise.all([
      getApiSyncState(),
      getGlobalSyncStatus(),
      getEnrichedQueueStatuses(),
      getEnrichedWorkerJobStatuses(),
      Promise.all(
        ENABLED_REGIONS.map(async (region) => [
          region,
          await getRegionHealthMetrics(region),
        ] as const)
      ).then(
        (entries) =>
          Object.fromEntries(entries) as Record<
            AlbionRegion,
            Awaited<ReturnType<typeof getRegionHealthMetrics>>
          >
      ),
    ]);

  return {
    syncStates,
    globalStatus,
    healthMetrics,
    queues,
    crons: {
      jobs: workerStatus.jobs,
      connectivity: workerStatus.connectivity,
      health: workerStatus.health,
      fetchedAt: workerStatus.fetchedAt,
    },
  };
}

export async function buildAdminDashboardData() {
  const [snapshot, entityCounts] = await Promise.all([
    buildAdminSnapshot(),
    getRegionEntityCounts(),
  ]);

  return {
    ...snapshot,
    entityCounts,
  };
}
