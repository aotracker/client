"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUtcTimeOfDay, regionLabel } from "@/lib/utils";
import { playerPath, guildPath } from "@/lib/seo";
import { RelativeTimeLabel } from "@/components/RelativeTime";
import type { QueueJobSummary, QueueStatusSnapshot } from "@/lib/jobs/queue";
import type {
  EnrichedWorkerJobStatus,
  WorkerConnectivitySnapshot,
  WorkerHealthSummary,
} from "@/lib/jobs/worker-display";
import {
  WORKER_DISPLAY_LABEL,
  isWorkerDisplayDegraded,
  workerAlertMessage,
  workerDisplayBadgeVariant,
} from "@/lib/jobs/worker-display";

interface QueueStatusResponse {
  queue: QueueStatusSnapshot | null;
  fetchedAt: string;
  error: string | null;
}

interface CronStatusResponse {
  jobs: EnrichedWorkerJobStatus[];
  connectivity: WorkerConnectivitySnapshot | null;
  health: WorkerHealthSummary;
  fetchedAt: string;
}

interface WorkerQueuesPanelProps {
  initial: QueueStatusResponse;
  initialCrons: CronStatusResponse;
}

const POLL_MS = 3000;

type DisplayState = QueueJobSummary["state"];
type StatusFilter = "all" | DisplayState;

const STATE_BADGE: Record<DisplayState, "solo" | "group" | "outline" | "zvz"> = {
  active: "solo",
  waiting: "group",
  delayed: "outline",
  failed: "zvz",
  completed: "outline",
};

const STATE_LABEL: Record<DisplayState, string> = {
  active: "Processing",
  waiting: "Queued",
  delayed: "Scheduled",
  failed: "Failed",
  completed: "Completed",
};

function asString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

type JobDetail = {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
};

function describeJob(job: QueueJobSummary): {
  title: string;
  summary: string;
  details: JobDetail[];
} {
  const regionRaw = asString(job.data.region);
  const region = regionRaw ? regionLabel(regionRaw) : null;
  const playerAlbionId =
    asString(job.data.albionId) ?? asString(job.data.playerId);
  const playerName = asString(job.data.playerName);
  const guildAlbionId = asString(job.data.guildId);
  const guildName = asString(job.data.guildName);
  const allianceId = asString(job.data.allianceId);
  const eventId = asString(job.data.eventId);
  const battleId = asString(job.data.battleId);
  const feedId = asString(job.data.feedId);
  const searchQuery = asString(job.data.searchQuery);
  const entityType = asString(job.data.entityType);
  const entityName = asString(job.data.entityName);

  const details: JobDetail[] = [];
  if (region) details.push({ label: "Region", value: region });
  if (playerAlbionId) {
    const displayName = playerName ?? playerAlbionId;
    details.push({
      label: "Player",
      value: displayName,
      href: regionRaw ? playerPath(regionRaw, displayName) : undefined,
      mono: !playerName,
    });
  }
  if (guildAlbionId) {
    const displayName = guildName ?? guildAlbionId;
    details.push({
      label: "Guild",
      value: displayName,
      href: regionRaw ? guildPath(regionRaw, displayName) : undefined,
      mono: !guildName,
    });
  }
  if (allianceId) {
    details.push({
      label: "Alliance",
      value: allianceId,
      href: regionRaw ? `/alliance/${regionRaw}/${allianceId}` : undefined,
    });
  }
  if (eventId) {
    details.push({
      label: "Event",
      value: `#${eventId}`,
      href: regionRaw ? `/kill/${regionRaw}/${eventId}` : undefined,
    });
  }
  if (battleId) {
    details.push({
      label: "Battle",
      value: `#${battleId}`,
      href: regionRaw ? `/battle/${regionRaw}/${battleId}` : undefined,
    });
  }
  if (feedId) {
    details.push({ label: "Feed", value: feedId, mono: true });
  }
  if (searchQuery) {
    details.push({ label: "Query", value: searchQuery });
  }
  if (entityType) {
    details.push({ label: "Type", value: entityType });
  }
  if (entityName) {
    details.push({ label: "Name", value: entityName });
  }

  switch (job.name) {
    case "ingest-event":
      return {
        title: "Ingest kill event",
        summary: eventId
          ? `Fetch and cache kill #${eventId}`
          : "Fetch and cache kill detail",
        details,
      };
    case "sync-player":
    case "refresh-player":
    case "backfill-player-history": {
      const playerLabel = playerName ?? playerAlbionId;
      return {
        title: "Sync player",
        summary: playerLabel
          ? `${playerLabel} — profile + kill/death history`
          : "Profile + kill/death history",
        details,
      };
    }
    case "sync-guild":
    case "refresh-guild":
    case "backfill-guild-top-kills": {
      const guildLabel = guildName ?? guildAlbionId;
      return {
        title: "Sync guild",
        summary: guildLabel
          ? `${guildLabel} — profile + top kills`
          : "Profile + top kills",
        details,
      };
    }
    case "refresh-alliance":
      return {
        title: "Sync alliance",
        summary: "Alliance metadata and guilds",
        details,
      };
    case "sync-battle":
      return {
        title: "Sync battle",
        summary: battleId
          ? `Battle #${battleId} detail + events`
          : "Battle detail + events",
        details,
      };
    case "notify-discord":
      return {
        title: "Discord notify",
        summary: battleId
          ? `Post battle #${battleId} recap to Discord`
          : eventId
            ? `Post kill #${eventId} to Discord`
            : "Post to Discord",
        details,
      };
    case "live-search":
      return {
        title: "Live search",
        summary: searchQuery
          ? `Search “${searchQuery}”`
          : "Search players and guilds",
        details,
      };
    case "entity-resolve":
      return {
        title: "Resolve entity",
        summary: entityName
          ? `${entityType ?? "entity"} “${entityName}”`
          : "Look up player or guild by name",
        details,
      };
    default:
      return {
        title: job.name,
        summary: "Background job",
        details,
      };
  }
}

const STATE_PILL: Record<DisplayState, { idle: string; active: string }> = {
  active: {
    idle: "border-solo/40 bg-solo/15 text-solo hover:bg-solo/25",
    active: "border-solo/60 bg-solo/30 text-solo ring-1 ring-solo/40",
  },
  waiting: {
    idle: "border-group/40 bg-group/15 text-group hover:bg-group/25",
    active: "border-group/60 bg-group/30 text-group ring-1 ring-group/40",
  },
  delayed: {
    idle: "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
    active: "border-border bg-muted/60 text-foreground ring-1 ring-border",
  },
  failed: {
    idle: "border-zvz/40 bg-zvz/15 text-zvz hover:bg-zvz/25",
    active: "border-zvz/60 bg-zvz/30 text-zvz ring-1 ring-zvz/40",
  },
  completed: {
    idle: "border-emerald-800/50 bg-emerald-950/40 text-emerald-700 hover:bg-emerald-950/55",
    active:
      "border-emerald-700/60 bg-emerald-950/60 text-emerald-700 ring-1 ring-emerald-700/40",
  },
};

function CountPill({
  label,
  value,
  state,
  active,
  onClick,
}: {
  label: string;
  value: number;
  state: DisplayState;
  active?: boolean;
  onClick?: () => void;
}) {
  const tone = STATE_PILL[state];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-center transition-colors ${
        active ? tone.active : tone.idle
      }`}
    >
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </button>
  );
}

function jobTiming(job: QueueJobSummary): ReactNode {
  if (job.state === "active" && job.processedOn) {
    return (
      <>
        Started <RelativeTimeLabel date={new Date(job.processedOn)} />
      </>
    );
  }
  if (job.state === "completed" && job.completedOn) {
    return (
      <>
        Completed <RelativeTimeLabel date={new Date(job.completedOn)} />
      </>
    );
  }
  if (job.state === "delayed" && job.delay != null) {
    return (
      <span suppressHydrationWarning>
        Starts in {Math.max(0, Math.round(job.delay / 1000))}s
      </span>
    );
  }
  if (job.state === "waiting" && job.timestamp) {
    return (
      <>
        Queued <RelativeTimeLabel date={new Date(job.timestamp)} />
      </>
    );
  }
  if (job.state === "failed" && job.timestamp) {
    return (
      <>
        Failed <RelativeTimeLabel date={new Date(job.timestamp)} />
      </>
    );
  }
  return null;
}

function JobCard({ job }: { job: QueueJobSummary }) {
  const info = describeJob(job);
  const state = job.state;
  const timing = jobTiming(job);

  return (
    <li className="rounded-md border border-border/50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={STATE_BADGE[state]}
          className={
            state === "completed"
              ? "border-emerald-800/50 bg-emerald-950/50 text-emerald-700"
              : undefined
          }
        >
          {STATE_LABEL[state]}
        </Badge>
        <span className="text-sm font-medium">{info.title}</span>
        <span className="text-xs text-muted-foreground">{info.summary}</span>
        {timing && (
          <span className="ml-auto text-xs text-muted-foreground">{timing}</span>
        )}
      </div>

      <p className="mt-1 font-mono text-xs text-muted-foreground/80">
        {job.queue}:{job.id}
        {job.state === "delayed" && job.runAt
          ? ` · runAt ${formatUtcTimeOfDay(job.runAt)}`
          : job.state === "waiting"
            ? " · ready"
            : job.state === "completed" && job.completedOn
              ? ` · done ${formatUtcTimeOfDay(job.completedOn)}`
              : ""}
      </p>

      {info.details.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {info.details.map((detail) => (
            <span key={detail.label}>
              <span className="text-muted-foreground/70">{detail.label}:</span>{" "}
              {detail.href ? (
                <Link
                  href={detail.href}
                  className={`text-foreground/90 underline-offset-2 hover:text-primary hover:underline ${
                    detail.mono ? "font-mono" : ""
                  }`}
                >
                  {detail.value}
                </Link>
              ) : (
                <span
                  className={`text-foreground/90 ${
                    detail.mono ? "font-mono" : ""
                  }`}
                >
                  {detail.value}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {(job.state === "failed" || job.state === "delayed") && job.failedReason && (
        <p
          className={`mt-1.5 text-xs ${
            job.state === "failed" ? "text-red-300" : "text-amber-200/80"
          }`}
        >
          {job.failedReason}
        </p>
      )}
    </li>
  );
}

function WorkerStatusRow({ job }: { job: EnrichedWorkerJobStatus }) {
  const failedJobs =
    typeof job.lastResult?.failed === "number" ? job.lastResult.failed : 0;
  const deferredJobs =
    typeof job.lastResult?.deferred === "number" ? job.lastResult.deferred : 0;
  const processedJobs =
    typeof job.lastResult?.processed === "number"
      ? job.lastResult.processed
      : null;

  const meta: ReactNode[] = [job.schedule];
  if (job.workersConnected > 0) {
    meta.push(
      `${job.workersConnected} worker${job.workersConnected === 1 ? "" : "s"} connected`
    );
  }
  if (job.lastRunAt) {
    meta.push(
      <>
        Last run <RelativeTimeLabel date={job.lastRunAt} />
      </>
    );
  }
  if (processedJobs != null && job.lastStatus === "success") {
    let batch = `${processedJobs} processed`;
    if (failedJobs > 0) batch += `, ${failedJobs} failed`;
    if (deferredJobs > 0) batch += `, ${deferredJobs} deferred`;
    meta.push(batch);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge variant={workerDisplayBadgeVariant(job.displayStatus)}>
          {WORKER_DISPLAY_LABEL[job.displayStatus]}
        </Badge>
        <span className="text-sm font-medium">{job.label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {job.path}
        </span>
      </div>
      {meta.length > 0 && (
        <p className="text-xs text-muted-foreground sm:text-right">
          {meta.map((item, index) => (
            <span key={index}>
              {index > 0 ? " · " : null}
              {item}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export function WorkerQueuesPanel({
  initial,
  initialCrons,
}: WorkerQueuesPanelProps) {
  const [status, setStatus] = useState(initial);
  const [cronStatus, setCronStatus] = useState(initialCrons);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        setIsRefreshing(true);
        const res = await fetch("/api/admin/queues", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          queues?: QueueStatusResponse;
          crons?: CronStatusResponse;
        };
        if (!cancelled) {
          if (json.queues) setStatus(json.queues);
          if (json.crons) setCronStatus(json.crons);
        }
      } catch {
        // Keep last good snapshot
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const workerJobs = cronStatus.jobs;
  const allJobs = status.queue?.jobs ?? [];
  const visibleJobs = useMemo(() => {
    if (statusFilter === "all") return allJobs;
    return allJobs.filter((job) => job.state === statusFilter);
  }, [allJobs, statusFilter]);

  const waitingCount = status.queue?.counts.waiting ?? 0;
  const delayedCount = status.queue?.counts.delayed ?? 0;
  const completedCount = status.queue?.counts.completed ?? 0;

  type WorkerAlert = {
    key: string;
    tone: "error" | "warn";
    title: string;
    body: ReactNode;
  };

  const alerts: WorkerAlert[] = workerJobs.flatMap((job): WorkerAlert[] => {
    if (!isWorkerDisplayDegraded(job.displayStatus)) return [];

    const tone = job.displayStatus === "error" ? "error" : "warn";
    return [
      {
        key: `${job.jobKey}-${job.displayStatus}`,
        tone,
        title: `${job.label} — ${WORKER_DISPLAY_LABEL[job.displayStatus]}`,
        body: workerAlertMessage(job),
      },
    ];
  });

  return (
    <Card>
      <CardHeader className="space-y-1 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">BullMQ workers &amp; queues</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {isRefreshing ? "Refreshing…" : "Live"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Updated <RelativeTimeLabel date={status.fetchedAt} />
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {alerts.map((alert) => (
          <div
            key={alert.key}
            className={`rounded-md border px-3 py-2.5 text-sm ${
              alert.tone === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            <p className="font-medium">{alert.title}</p>
            <p className="mt-0.5 text-xs opacity-90">{alert.body}</p>
          </div>
        ))}

        {workerJobs.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Workers
            </h3>
            <ul className="space-y-2">
              {workerJobs.map((job) => (
                <li key={job.jobKey}>
                  <WorkerStatusRow job={job} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Queue
          </h3>

          {status.queue && (
            <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-5">
              <CountPill
                label="Processing"
                value={status.queue.counts.active}
                state="active"
                active={statusFilter === "active"}
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev === "active" ? "all" : "active"
                  )
                }
              />
              <CountPill
                label="Queued"
                value={waitingCount}
                state="waiting"
                active={statusFilter === "waiting"}
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev === "waiting" ? "all" : "waiting"
                  )
                }
              />
              <CountPill
                label="Scheduled"
                value={delayedCount}
                state="delayed"
                active={statusFilter === "delayed"}
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev === "delayed" ? "all" : "delayed"
                  )
                }
              />
              <CountPill
                label="Failed"
                value={status.queue.counts.failed}
                state="failed"
                active={statusFilter === "failed"}
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev === "failed" ? "all" : "failed"
                  )
                }
              />
              <CountPill
                label="Completed"
                value={completedCount}
                state="completed"
                active={statusFilter === "completed"}
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev === "completed" ? "all" : "completed"
                  )
                }
              />
            </div>
          )}

          {status.error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {status.error}
            </p>
          )}

          {!status.queue && !status.error && (
            <p className="text-sm text-muted-foreground">
              No queue data yet. Ensure Redis is running and start workers from{" "}
              <code className="text-primary">ingest/</code> with{" "}
              <code className="text-primary">npm run worker</code>.
            </p>
          )}

          {status.queue &&
            (visibleJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {statusFilter === "all"
                  ? "Queue is clear — nothing processing, queued, scheduled, failed, or recently completed."
                  : `No ${STATE_LABEL[statusFilter].toLowerCase()} jobs right now.`}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Showing {visibleJobs.length} job
                  {visibleJobs.length === 1 ? "" : "s"}
                  {statusFilter !== "all"
                    ? ` · filter: ${STATE_LABEL[statusFilter]}`
                    : ""}
                  {statusFilter === "completed" || statusFilter === "all"
                    ? " · completed within last 3 hours"
                    : ""}
                </p>
                <ul className="scrollbar-themed max-h-96 space-y-2 overflow-y-auto">
                  {visibleJobs.map((job) => (
                    <JobCard key={`${job.id}-${job.state}`} job={job} />
                  ))}
                </ul>
              </>
            ))}
        </section>
      </CardContent>
    </Card>
  );
}
