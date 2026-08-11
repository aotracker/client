import type { GlobalSyncStatus } from "@/lib/health/sync-status";
import type { WorkerHealthSummary } from "@/lib/jobs/worker-display";
import {
  WORKER_DISPLAY_LABEL,
  workerAlertMessage,
} from "@/lib/jobs/worker-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

export function AdminStatusOverview({
  globalStatus,
  workerHealth,
}: {
  globalStatus: GlobalSyncStatus;
  workerHealth: WorkerHealthSummary;
}) {
  const isHealthy = globalStatus.isHealthy && workerHealth.isHealthy;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Overall Status
          <Badge variant={isHealthy ? "solo" : "zvz"}>
            {isHealthy ? "Healthy" : "Degraded"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {globalStatus.message && !globalStatus.isHealthy && (
          <p className="text-amber-400">{globalStatus.message}</p>
        )}
        {workerHealth.degradedJobs.map((job) => (
          <p key={job.jobKey} className="text-amber-400">
            {job.label} — {WORKER_DISPLAY_LABEL[job.displayStatus]}:{" "}
            {workerAlertMessage(job)}
          </p>
        ))}
        <p>
          Last ingest:{" "}
          {globalStatus.lastSyncAt
            ? formatRelativeTime(globalStatus.lastSyncAt)
            : "Never"}
        </p>
        {globalStatus.isStale && (
          <p className="text-amber-400">
            Ingest is delayed ({globalStatus.lagMinutes}m since last poll)
          </p>
        )}
        {globalStatus.anyCircuitOpen && (
          <p className="text-amber-400">
            One or more regions are cooling down — workers defer and retry
          </p>
        )}
      </CardContent>
    </Card>
  );
}
