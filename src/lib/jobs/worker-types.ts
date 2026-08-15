export const INGEST_POLL_INTERVAL_MS = 25 * 60 * 1000;
export const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const LIVE_EVENTS_INTERVAL_MS = 45 * 1000;
export const DISCORD_CATCHUP_INTERVAL_MS = 5 * 60 * 1000;

export const WORKER_JOB_DEFINITIONS = [
  {
    jobKey: "ingest",
    label: "Ingest poll",
    path: "ingest-scheduler",
    schedule: `Every ${INGEST_POLL_INTERVAL_MS / 60_000} minutes (BullMQ repeatable)`,
  },
  {
    jobKey: "health",
    label: "API health check",
    path: "ingest-scheduler",
    schedule: `Every ${HEALTH_CHECK_INTERVAL_MS / 60_000} minutes (BullMQ repeatable)`,
  },
  {
    jobKey: "live-events",
    label: "Live events poll",
    path: "ingest-scheduler",
    schedule: `Every ${LIVE_EVENTS_INTERVAL_MS / 1000} seconds (BullMQ repeatable)`,
  },
  {
    jobKey: "discord-catchup",
    label: "Discord guild catch-up",
    path: "ingest-scheduler",
    schedule: `Every ${DISCORD_CATCHUP_INTERVAL_MS / 60_000} minutes (BullMQ repeatable)`,
  },
  {
    jobKey: "process-jobs",
    label: "Job processors",
    path: "ingest-worker",
    schedule: "Continuous (ingest, refresh, discord queues)",
  },
] as const;

export type WorkerJobKey = (typeof WORKER_JOB_DEFINITIONS)[number]["jobKey"];

export const SCHEDULER_JOB_KEYS = [
  "ingest",
  "health",
  "live-events",
  "discord-catchup",
] as const satisfies readonly WorkerJobKey[];

export function isSchedulerJobKey(jobKey: WorkerJobKey): boolean {
  return (SCHEDULER_JOB_KEYS as readonly string[]).includes(jobKey);
}

/** Alias for status UI compatibility. */
export type CronJobKey = WorkerJobKey;
export const CRON_JOB_DEFINITIONS = WORKER_JOB_DEFINITIONS;

/** Ingest poll runs every 25 minutes — allow slack past a slow run. */
export const INGEST_ALIVE_MS = 30 * 60 * 1000;
/** Health check runs every 5 minutes — allow a little slack. */
export const HEALTH_ALIVE_MS = 8 * 60 * 1000;
/** Live events poll runs every 45 seconds — allow a slow multi-region pass. */
export const LIVE_EVENTS_ALIVE_MS = 2 * 60 * 1000;
/** Discord catch-up runs every 5 minutes — same slack as health. */
export const DISCORD_CATCHUP_ALIVE_MS = 8 * 60 * 1000;
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
