import "server-only";

import { fetchWorkerConnectivity } from "@/lib/ingest-api";
import {
  enrichWorkerJobStatus,
  type EnrichedWorkerJobStatus,
  type WorkerConnectivitySnapshot,
  summarizeWorkerHealth,
  type WorkerHealthSummary,
} from "./worker-display";
import { getWorkerJobStatuses } from "./worker-state";

export type {
  EnrichedWorkerJobStatus,
  WorkerConnectivitySnapshot,
  WorkerDisplayStatus,
  WorkerHealthSummary,
} from "./worker-display";

export {
  WORKER_DISPLAY_LABEL,
  isWorkerDisplayDegraded,
  workerDisplayBadgeVariant,
  workerAlertMessage,
  summarizeWorkerHealth,
} from "./worker-display";

export async function getEnrichedWorkerJobStatuses(): Promise<{
  jobs: EnrichedWorkerJobStatus[];
  connectivity: WorkerConnectivitySnapshot | null;
  health: WorkerHealthSummary;
  fetchedAt: string;
}> {
  const [base, connectivity] = await Promise.all([
    getWorkerJobStatuses(),
    fetchWorkerConnectivity(),
  ]);

  const jobs = base.jobs.map((job) => enrichWorkerJobStatus(job, connectivity));
  const health = summarizeWorkerHealth(jobs);

  return {
    jobs,
    connectivity,
    health,
    fetchedAt: base.fetchedAt,
  };
}

/** @deprecated Use getEnrichedWorkerJobStatuses */
export const getEnrichedCronJobStatuses = getEnrichedWorkerJobStatuses;
