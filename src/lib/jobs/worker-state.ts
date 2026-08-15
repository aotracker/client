import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import {
  CRON_JOB_DEFINITIONS,
  DISCORD_CATCHUP_ALIVE_MS,
  HEALTH_ALIVE_MS,
  INGEST_ALIVE_MS,
  LIVE_EVENTS_ALIVE_MS,
  PROCESS_JOBS_ALIVE_MS,
  WORKER_JOB_DEFINITIONS,
  type CronJobKey,
  type CronJobStatus,
  type WorkerJobKey,
  type WorkerJobStatus,
} from "./worker-types";

export {
  CRON_JOB_DEFINITIONS,
  DISCORD_CATCHUP_ALIVE_MS,
  HEALTH_ALIVE_MS,
  INGEST_ALIVE_MS,
  LIVE_EVENTS_ALIVE_MS,
  PROCESS_JOBS_ALIVE_MS,
  WORKER_JOB_DEFINITIONS,
  type CronJobKey,
  type CronJobStatus,
  type WorkerJobKey,
  type WorkerJobStatus,
};

const ALIVE_MS_BY_JOB_KEY: Record<WorkerJobKey, number> = {
  ingest: INGEST_ALIVE_MS,
  health: HEALTH_ALIVE_MS,
  "live-events": LIVE_EVENTS_ALIVE_MS,
  "discord-catchup": DISCORD_CATCHUP_ALIVE_MS,
  "process-jobs": PROCESS_JOBS_ALIVE_MS,
};

export function isWorkerAlive(
  lastRunAt: Date | string | null | undefined,
  maxAgeMs: number,
  nowMs = Date.now()
): boolean {
  if (!lastRunAt) return false;
  const t =
    typeof lastRunAt === "string"
      ? new Date(lastRunAt).getTime()
      : lastRunAt.getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t <= maxAgeMs;
}

export function isProcessJobsAlive(
  lastRunAt: Date | string | null | undefined,
  nowMs = Date.now()
): boolean {
  return isWorkerAlive(lastRunAt, PROCESS_JOBS_ALIVE_MS, nowMs);
}

function getDefinition(jobKey: WorkerJobKey) {
  const definition = WORKER_JOB_DEFINITIONS.find((job) => job.jobKey === jobKey);
  if (!definition) {
    throw new Error(`Unknown worker job: ${jobKey}`);
  }
  return definition;
}

async function ensureWorkerRow(jobKey: WorkerJobKey) {
  const definition = getDefinition(jobKey);
  const existing = await db.query.cronJobState.findFirst({
    where: eq(schema.cronJobState.jobKey, jobKey),
  });
  if (existing) return existing;

  const [inserted] = await db
    .insert(schema.cronJobState)
    .values({
      jobKey: definition.jobKey,
      label: definition.label,
      path: definition.path,
      schedule: definition.schedule,
    })
    .returning();
  return inserted;
}

export function cronHasActiveError(input: {
  lastStatus: string | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
}): boolean {
  if (input.lastStatus !== "error" || !input.lastErrorMessage) return false;
  if (!input.lastErrorAt) return true;
  if (!input.lastSuccessAt) return true;
  return input.lastErrorAt > input.lastSuccessAt;
}

export async function recordWorkerRunSuccess(
  jobKey: WorkerJobKey,
  result?: Record<string, unknown>
): Promise<void> {
  await ensureWorkerRow(jobKey);
  const now = new Date();

  await db
    .update(schema.cronJobState)
    .set({
      lastRunAt: now,
      lastSuccessAt: now,
      lastStatus: "success",
      lastResult: result ?? null,
      lastErrorMessage: null,
      updatedAt: now,
    })
    .where(eq(schema.cronJobState.jobKey, jobKey));
}

export async function recordWorkerRunError(
  jobKey: WorkerJobKey,
  errorMessage: string
): Promise<void> {
  await ensureWorkerRow(jobKey);
  const now = new Date();

  await db
    .update(schema.cronJobState)
    .set({
      lastRunAt: now,
      lastErrorAt: now,
      lastErrorMessage: errorMessage,
      lastStatus: "error",
      updatedAt: now,
    })
    .where(eq(schema.cronJobState.jobKey, jobKey));

  const { recordOpsEvent } = await import("../ops/events");
  await recordOpsEvent({
    source: "worker",
    severity: "error",
    category: jobKey,
    message: errorMessage,
    details: { jobKey },
  });
}

/** @deprecated Use recordWorkerRunSuccess */
export const recordCronRunSuccess = recordWorkerRunSuccess;
/** @deprecated Use recordWorkerRunError */
export const recordCronRunError = recordWorkerRunError;

export async function getWorkerJobStatuses(): Promise<{
  jobs: WorkerJobStatus[];
  fetchedAt: string;
}> {
  let rows: (typeof schema.cronJobState.$inferSelect)[] = [];
  try {
    rows = await db.query.cronJobState.findMany();
  } catch {
    // Table may not exist until migration is applied
  }

  const rowByKey = new Map(rows.map((row) => [row.jobKey, row]));

  const jobs = WORKER_JOB_DEFINITIONS.map((definition) => {
    const row = rowByKey.get(definition.jobKey);
    const lastStatus: WorkerJobStatus["lastStatus"] =
      row?.lastStatus === "success" || row?.lastStatus === "error"
        ? row.lastStatus
        : null;

    const hasActiveError = cronHasActiveError({
      lastStatus,
      lastSuccessAt: row?.lastSuccessAt ?? null,
      lastErrorAt: row?.lastErrorAt ?? null,
      lastErrorMessage: row?.lastErrorMessage ?? null,
    });

    return {
      jobKey: definition.jobKey,
      label: definition.label,
      path: definition.path,
      schedule: definition.schedule,
      lastRunAt: row?.lastRunAt?.toISOString() ?? null,
      lastSuccessAt: row?.lastSuccessAt?.toISOString() ?? null,
      lastErrorAt: row?.lastErrorAt?.toISOString() ?? null,
      lastErrorMessage: row?.lastErrorMessage ?? null,
      lastStatus,
      lastResult:
        row?.lastResult && typeof row.lastResult === "object"
          ? (row.lastResult as Record<string, unknown>)
          : null,
      hasActiveError,
      isAlive: isWorkerAlive(
        row?.lastRunAt ?? null,
        ALIVE_MS_BY_JOB_KEY[definition.jobKey]
      ),
    };
  });

  return {
    jobs,
    fetchedAt: new Date().toISOString(),
  };
}

/** @deprecated Use getWorkerJobStatuses */
export const getCronJobStatuses = getWorkerJobStatuses;
