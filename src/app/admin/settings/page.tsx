import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/PageSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsRegistryPanel } from "@/components/admin/SettingsRegistryPanel";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";
import { getConfigRegistry } from "@/lib/ops/config-registry";

export const dynamic = "force-dynamic";

async function getRuntimeConfigSnapshot() {
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
    // cron_job_state may be unavailable
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

  return {
    disabledRegions,
    enabledRegions: ENABLED_REGIONS,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    ingestApiConfigured: Boolean(process.env.INGEST_API_URL?.trim()),
    ingestApiReachable,
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    jobsSource,
  };
}

export default async function AdminSettingsPage() {
  const [runtime, registry] = await Promise.all([
    getRuntimeConfigSnapshot(),
    Promise.resolve(getConfigRegistry()),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Read-only runtime configuration and threshold reference"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <ConfigRow label="NODE_ENV" value={runtime.nodeEnv} />
          <ConfigRow
            label="Enabled regions"
            value={runtime.enabledRegions.join(", ")}
          />
          <ConfigRow
            label="Disabled regions"
            value={
              runtime.disabledRegions.length > 0
                ? runtime.disabledRegions.join(", ")
                : "none"
            }
          />
          <ConfigRow
            label="Ingest API configured"
            value={runtime.ingestApiConfigured ? "yes" : "no"}
          />
          <ConfigRow
            label="Ingest API reachable"
            value={runtime.ingestApiReachable ? "yes" : "no"}
          />
          <ConfigRow
            label="CRON_SECRET configured"
            value={runtime.cronSecretConfigured ? "yes" : "no"}
          />
          <ConfigRow
            label="Worker source (last heartbeat)"
            value={runtime.jobsSource ?? "—"}
          />
        </CardContent>
      </Card>

      <SettingsRegistryPanel groups={registry} />
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-md border border-border/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
