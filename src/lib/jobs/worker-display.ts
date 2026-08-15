import type { WorkerJobKey, WorkerJobStatus } from "./worker-types";

export type WorkerDisplayStatus =
  | "error"
  | "running"
  | "active"
  | "idle"
  | "stale"
  | "down"
  | "unknown";

export interface WorkerConnectivitySnapshot {
  schedulerWorkers: number;
  ingestWorkers: number;
  refreshWorkers: number;
  processorWorkers: number;
  schedulerJobActive: {
    ingestPoll: boolean;
    healthCheck: boolean;
  };
  processorJobsActive: boolean;
  fetchedAt: string;
}

export interface EnrichedWorkerJobStatus extends WorkerJobStatus {
  displayStatus: WorkerDisplayStatus;
  workersConnected: number;
  isRunningNow: boolean;
}

export const WORKER_DISPLAY_LABEL: Record<WorkerDisplayStatus, string> = {
  error: "Error",
  running: "Running",
  active: "Active",
  idle: "Idle",
  stale: "Stale",
  down: "Down",
  unknown: "Unknown",
};

export function workersConnectedForJob(
  jobKey: WorkerJobKey,
  connectivity: WorkerConnectivitySnapshot | null | undefined
): number {
  if (!connectivity) return 0;
  if (jobKey === "ingest" || jobKey === "health") {
    return connectivity.schedulerWorkers;
  }
  return connectivity.processorWorkers;
}

export function isJobRunningNow(
  jobKey: WorkerJobKey,
  connectivity: WorkerConnectivitySnapshot | null | undefined
): boolean {
  if (!connectivity) return false;
  if (jobKey === "ingest") return connectivity.schedulerJobActive.ingestPoll;
  if (jobKey === "health") return connectivity.schedulerJobActive.healthCheck;
  return connectivity.processorJobsActive;
}

export function resolveWorkerDisplayStatus(input: {
  jobKey: WorkerJobKey;
  hasActiveError: boolean;
  isAlive: boolean | null;
  lastRunAt: string | null;
  connectivity: WorkerConnectivitySnapshot | null | undefined;
}): WorkerDisplayStatus {
  const { jobKey, hasActiveError, isAlive, lastRunAt, connectivity } = input;

  if (hasActiveError) return "error";

  const connectivityKnown = connectivity != null;

  if (!connectivityKnown) {
    if (isAlive) return "active";
    if (!lastRunAt) return "unknown";
    if (jobKey === "process-jobs") return "idle";
    return "stale";
  }

  const workersConnected = workersConnectedForJob(jobKey, connectivity);
  const isRunningNow = isJobRunningNow(jobKey, connectivity);

  if (isRunningNow) return "running";
  if (isAlive && workersConnected > 0) return "active";

  if (workersConnected > 0) {
    if (jobKey === "process-jobs") return "idle";
    return "stale";
  }

  if (isAlive) return "down";

  if (!lastRunAt) return "unknown";
  return "down";
}

export function enrichWorkerJobStatus(
  job: WorkerJobStatus,
  connectivity: WorkerConnectivitySnapshot | null | undefined
): EnrichedWorkerJobStatus {
  const workersConnected = workersConnectedForJob(job.jobKey, connectivity);
  const isRunningNow = isJobRunningNow(job.jobKey, connectivity);
  const displayStatus = resolveWorkerDisplayStatus({
    jobKey: job.jobKey,
    hasActiveError: job.hasActiveError,
    isAlive: job.isAlive,
    lastRunAt: job.lastRunAt,
    connectivity,
  });

  return {
    ...job,
    displayStatus,
    workersConnected,
    isRunningNow,
  };
}

export function isWorkerDisplayDegraded(
  status: WorkerDisplayStatus
): boolean {
  return status === "stale" || status === "down" || status === "error";
}

export function workerDisplayBadgeVariant(
  status: WorkerDisplayStatus
): "solo" | "group" | "outline" | "zvz" {
  switch (status) {
    case "error":
    case "down":
      return "zvz";
    case "running":
    case "active":
      return "solo";
    case "idle":
      return "group";
    case "stale":
      return "zvz";
    default:
      return "outline";
  }
}

export function workerAlertMessage(job: EnrichedWorkerJobStatus): string {
  switch (job.displayStatus) {
    case "error":
      return (
        job.lastErrorMessage ??
        "The worker reported an error on its last run."
      );
    case "stale":
      return `${job.label} is overdue — BullMQ workers are connected but the last successful run was too long ago.`;
    case "down":
      return `No BullMQ workers are connected for ${job.label}. Check that ingest-scheduler and ingest-worker are running on the VM (pm2 status).`;
    default:
      return "";
  }
}

export interface WorkerHealthSummary {
  isHealthy: boolean;
  degradedJobs: EnrichedWorkerJobStatus[];
}

export function summarizeWorkerHealth(
  jobs: EnrichedWorkerJobStatus[]
): WorkerHealthSummary {
  const degradedJobs = jobs.filter((job) =>
    isWorkerDisplayDegraded(job.displayStatus)
  );
  return {
    isHealthy: degradedJobs.length === 0,
    degradedJobs,
  };
}
