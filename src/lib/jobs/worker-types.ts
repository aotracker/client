export const WORKER_JOB_DEFINITIONS = [
  {
    jobKey: "ingest",
    label: "Ingest poll",
    path: "worker:scheduler",
    schedule: "Every 12 minutes (BullMQ repeatable)",
  },
  {
    jobKey: "health",
    label: "API health check",
    path: "worker:scheduler",
    schedule: "Every 5 minutes (BullMQ repeatable)",
  },
  {
    jobKey: "process-jobs",
    label: "Process jobs",
    path: "worker:process",
    schedule: "Continuous (BullMQ workers)",
  },
] as const;

export type WorkerJobKey = (typeof WORKER_JOB_DEFINITIONS)[number]["jobKey"];

/** Alias for status UI compatibility. */
export type CronJobKey = WorkerJobKey;
export const CRON_JOB_DEFINITIONS = WORKER_JOB_DEFINITIONS;

/** Ingest poll runs every 12 minutes — allow a little slack. */
export const INGEST_ALIVE_MS = 15 * 60 * 1000;
/** Health check runs every 5 minutes — allow a little slack. */
export const HEALTH_ALIVE_MS = 8 * 60 * 1000;
/** BullMQ job processors should heartbeat on every completed job. */
export const PROCESS_JOBS_ALIVE_MS = 90_000;

export interface WorkerJobStatus {
  jobKey: WorkerJobKey;
  label: string;
  path: string;
  schedule: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  lastStatus: "success" | "error" | null;
  lastResult: Record<string, unknown> | null;
  hasActiveError: boolean;
  isAlive: boolean | null;
}

/** Alias for status UI compatibility. */
export type CronJobStatus = WorkerJobStatus;
