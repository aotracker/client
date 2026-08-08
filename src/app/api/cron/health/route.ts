import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";
import {
  recordCronRunError,
  recordCronRunSuccess,
} from "@/lib/jobs/cron-state";
import { triggerSchedulerJob } from "@/lib/jobs/triggers";

export const dynamic = "force-dynamic";

/**
 * Emergency manual trigger: enqueue health check via ingest HTTP API.
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = await triggerSchedulerJob("health-check");
  if (!jobId) {
    const message = "Ingest API trigger failed";
    await recordCronRunError("health", message).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await recordCronRunSuccess("health", {
    task: "health",
    manual: true,
    jobId,
  });
  return NextResponse.json({ ok: true, task: "health", jobId });
}
