import {
  LATEST_KILL_STALE_MINUTES,
  HEALTH_CHECK_STALE_MINUTES,
} from "@/lib/health/sync-status";
import {
  INGEST_ALIVE_MS,
  HEALTH_ALIVE_MS,
  PROCESS_JOBS_ALIVE_MS,
} from "@/lib/jobs/worker-types";
import {
  CIRCUIT_RESET_MS,
  CIRCUIT_JOB_DEFER_MS,
  CIRCUIT_MAX_JOB_DEFERS,
  CIRCUIT_FAILURE_THRESHOLD,
} from "@/lib/db/api-state";
import { OPS_EVENTS_RETENTION_DAYS } from "@/lib/ops/events";

export const INGEST_POLL_INTERVAL_MS = 25 * 60 * 1000;
export const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export const API_REQUEST_LOG_RETENTION_DAYS = 7;

export interface ConfigRegistryGroup {
  title: string;
  items: Array<{
    name: string;
    value: string;
    source: string;
    note?: string;
  }>;
}

export function getConfigRegistry(): ConfigRegistryGroup[] {
  return [
    {
      title: "Scheduler",
      items: [
        {
          name: "Ingest poll interval",
          value: `${INGEST_POLL_INTERVAL_MS / 60_000} min`,
          source: "ingest/src/worker.ts",
        },
        {
          name: "Health check interval",
          value: `${HEALTH_CHECK_INTERVAL_MS / 60_000} min`,
          source: "ingest/src/worker.ts",
        },
      ],
    },
    {
      title: "Health thresholds",
      items: [
        {
          name: "Latest kill delayed warning",
          value: `${LATEST_KILL_STALE_MINUTES} min`,
          source: "client/src/lib/health/sync-status.ts",
          note: "Region API health shows Delayed when newest kill is older than this",
        },
        {
          name: "Health check stale",
          value: `${HEALTH_CHECK_STALE_MINUTES} min`,
          source: "client/src/lib/health/sync-status.ts",
        },
        {
          name: "Ingest worker alive slack",
          value: `${INGEST_ALIVE_MS / 60_000} min`,
          source: "client/src/lib/jobs/worker-state.ts",
        },
        {
          name: "Health worker alive slack",
          value: `${HEALTH_ALIVE_MS / 60_000} min`,
          source: "client/src/lib/jobs/worker-state.ts",
        },
        {
          name: "Process jobs alive slack",
          value: `${PROCESS_JOBS_ALIVE_MS / 1000}s`,
          source: "client/src/lib/jobs/worker-state.ts",
        },
      ],
    },
    {
      title: "Circuit breaker",
      items: [
        {
          name: "Open after failures",
          value: String(CIRCUIT_FAILURE_THRESHOLD),
          source: "client/src/lib/db/api-state.ts",
        },
        {
          name: "Circuit reset",
          value: `${CIRCUIT_RESET_MS / 1000}s`,
          source: "client/src/lib/db/api-state.ts",
        },
        {
          name: "Job defer on circuit",
          value: `${CIRCUIT_JOB_DEFER_MS / 1000}s`,
          source: "client/src/lib/db/api-state.ts",
        },
        {
          name: "Max circuit defers",
          value: String(CIRCUIT_MAX_JOB_DEFERS),
          source: "client/src/lib/db/api-state.ts",
        },
        {
          name: "Job defer (ingest constants)",
          value: "60s",
          source: "ingest/src/jobs/constants.ts",
          note: "Unused duplicate — api-state uses 30s for processor defer",
        },
      ],
    },
    {
      title: "Retention",
      items: [
        {
          name: "API request logs",
          value: `${API_REQUEST_LOG_RETENTION_DAYS} days`,
          source: "ingest/src/jobs/status.ts",
        },
        {
          name: "Ops events",
          value: `${OPS_EVENTS_RETENTION_DAYS} days`,
          source: "client/src/lib/ops/events.ts",
        },
        {
          name: "BullMQ completed jobs",
          value: "24h (Redis)",
          source: "ingest/src/jobs/queues.ts",
        },
        {
          name: "BullMQ failed jobs",
          value: "1h (Redis)",
          source: "ingest/src/jobs/queues.ts",
        },
      ],
    },
  ];
}
