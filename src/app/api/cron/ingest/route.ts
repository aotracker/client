import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-route";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";
import {
  recordCronRunError,
  recordCronRunSuccess,
} from "@/lib/jobs/cron-state";
import { triggerSchedulerJob } from "@/lib/jobs/triggers";

export const dynamic = "force-dynamic";

/**
 * Emergency manual trigger: enqueue ingest poll via ingest HTTP API.
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  const jobId = await triggerSchedulerJob("ingest-poll");
  if (!jobId) {
    const message = "Ingest API trigger failed";
    await recordCronRunError("ingest", message).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await recordCronRunSuccess("ingest", {
    task: "ingest",
    manual: true,
    jobId,
  });
  return NextResponse.json({ ok: true, task: "ingest", jobId });
}
