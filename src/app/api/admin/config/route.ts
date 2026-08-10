import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyCronRequest } from "@/lib/jobs/cron-auth";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";
import { getConfigRegistry } from "@/lib/ops/config-registry";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const disabledRaw = process.env.DISABLED_REGIONS?.trim();
  const disabledRegions = disabledRaw
    ? disabledRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  let jobsSource: string | null = null;
  try {
    const row = await db.query.cronJobState.findFirst({
      where: eq(schema.cronJobState.jobKey, "process-jobs"),
    });
    const result = row?.lastResult;
    if (result && typeof result === "object" && "source" in result) {
      jobsSource = String((result as { source?: unknown }).source ?? "");
    }
  } catch {
    // ignore
  }

  let ingestApiReachable = false;
  const ingestUrl = process.env.INGEST_API_URL?.trim();
  if (ingestUrl) {
    try {
      const res = await fetch(`${ingestUrl.replace(/\/$/, "")}/health`, {
        cache: "no-store",
      });
      ingestApiReachable = res.ok;
    } catch {
      ingestApiReachable = false;
    }
  }

  return NextResponse.json({
    runtime: {
      disabledRegions,
      enabledRegions: ENABLED_REGIONS,
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      ingestApiConfigured: Boolean(process.env.INGEST_API_URL?.trim()),
      ingestApiReachable,
      cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      jobsSource,
    },
    thresholds: getConfigRegistry(),
  });
}
