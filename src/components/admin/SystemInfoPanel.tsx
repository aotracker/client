"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelativeTimeLabel } from "@/components/RelativeTime";
import {
  formatBytes,
  formatUptime,
  memoryUsagePercent,
  type RuntimeSystemInfo,
  type ServiceStatus,
  type SystemInfoSnapshot,
} from "@/lib/ops/system-info-shared";

const POLL_MS = 10_000;

interface SystemInfoPanelProps {
  initial: SystemInfoSnapshot;
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <Badge variant={status.ok ? "solo" : "zvz"}>
      {status.ok
        ? status.latencyMs != null
          ? `OK (${status.latencyMs}ms)`
          : "OK"
        : "Error"}
    </Badge>
  );
}

function UsageBar({ percent, tone }: { percent: number; tone?: "default" | "warn" }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const barTone =
    tone === "warn" || clamped >= 90
      ? "bg-red-500"
      : clamped >= 75
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${barTone}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function MetricRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 rounded-md border border-border/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function RuntimeSection({
  title,
  runtime,
  extraRows,
}: {
  title: string;
  runtime: RuntimeSystemInfo;
  extraRows?: Array<{ label: string; value: string }>;
}) {
  const systemUsed =
    runtime.memory.systemTotalBytes - runtime.memory.systemFreeBytes;
  const systemPercent = memoryUsagePercent(
    systemUsed,
    runtime.memory.systemTotalBytes
  );
  const heapPercent = memoryUsagePercent(
    runtime.memory.heapUsedBytes,
    runtime.memory.heapTotalBytes
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <MetricRow label="Hostname" value={runtime.hostname} mono />
          <MetricRow
            label="Platform"
            value={`${runtime.platform} (${runtime.arch})`}
          />
          <MetricRow label="Node.js" value={runtime.nodeVersion} mono />
          <MetricRow
            label="Uptime"
            value={formatUptime(runtime.uptimeSeconds)}
          />
          {extraRows?.map((row) => (
            <MetricRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">System memory</span>
            <span className="text-muted-foreground">
              {formatBytes(systemUsed)} / {formatBytes(runtime.memory.systemTotalBytes)}{" "}
              ({systemPercent.toFixed(1)}%)
            </span>
          </div>
          <UsageBar percent={systemPercent} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Process heap</span>
            <span className="text-muted-foreground">
              {formatBytes(runtime.memory.heapUsedBytes)} /{" "}
              {formatBytes(runtime.memory.heapTotalBytes)} ({heapPercent.toFixed(1)}%)
            </span>
          </div>
          <UsageBar percent={heapPercent} />
          <p className="text-xs text-muted-foreground">
            RSS {formatBytes(runtime.memory.rssBytes)} · external{" "}
            {formatBytes(runtime.memory.externalBytes)}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">CPU</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <MetricRow label="Cores" value={String(runtime.cpu.cores)} />
            <MetricRow
              label="Load average"
              value={`${runtime.cpu.loadAvg1m.toFixed(2)} / ${runtime.cpu.loadAvg5m.toFixed(2)} / ${runtime.cpu.loadAvg15m.toFixed(2)}`}
              mono
            />
          </div>
          <p className="text-xs text-muted-foreground">{runtime.cpu.model}</p>
        </section>

        {runtime.disk && (
          <section className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Disk ({runtime.disk.mount})
              </span>
              <span className="text-muted-foreground">
                {formatBytes(runtime.disk.usedBytes)} /{" "}
                {formatBytes(runtime.disk.totalBytes)} (
                {runtime.disk.usagePercent.toFixed(1)}%)
              </span>
            </div>
            <UsageBar percent={runtime.disk.usagePercent} tone="warn" />
            <p className="text-xs text-muted-foreground">
              {formatBytes(runtime.disk.freeBytes)} free
            </p>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

export function SystemInfoPanel({ initial }: SystemInfoPanelProps) {
  const [snapshot, setSnapshot] = useState(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        setIsRefreshing(true);
        const res = await fetch("/api/admin/system-info", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as SystemInfoSnapshot;
        if (!cancelled) setSnapshot(json);
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

  const appExtraRows = [
    ...(snapshot.application.vercel
      ? [
          { label: "Hosting", value: "Vercel" },
          ...(snapshot.application.vercelRegion
            ? [{ label: "Region", value: snapshot.application.vercelRegion }]
            : []),
        ]
      : [{ label: "Hosting", value: "Self-hosted / local" }]),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{isRefreshing ? "Refreshing…" : "Live"}</Badge>
        <span className="text-xs text-muted-foreground">
          Updated <RelativeTimeLabel date={snapshot.fetchedAt} />
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RuntimeSection
          title="Application (Next.js)"
          runtime={snapshot.application}
          extraRows={appExtraRows}
        />

        {snapshot.ingest.runtime ? (
          <RuntimeSection
            title="Ingest VM"
            runtime={snapshot.ingest.runtime}
          />
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ingest VM</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {snapshot.ingest.configured
                  ? (snapshot.ingest.error ??
                    "Ingest API is configured but system metrics are unavailable.")
                  : "INGEST_API_URL is not configured. System metrics from the worker VM require the ingest HTTP API."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Services</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-md border border-border/50 px-3 py-2">
            <span className="text-muted-foreground">PostgreSQL</span>
            <StatusBadge status={snapshot.database} />
          </div>
          {snapshot.ingest.configured && (
            <div className="flex items-center justify-between gap-4 rounded-md border border-border/50 px-3 py-2">
              <span className="text-muted-foreground">Ingest API</span>
              <Badge variant={snapshot.ingest.reachable ? "solo" : "zvz"}>
                {snapshot.ingest.reachable ? "Reachable" : "Unavailable"}
              </Badge>
            </div>
          )}
          {snapshot.ingest.redis && (
            <div className="flex items-center justify-between gap-4 rounded-md border border-border/50 px-3 py-2">
              <span className="text-muted-foreground">Redis (ingest)</span>
              <StatusBadge status={snapshot.ingest.redis} />
            </div>
          )}
          <div className="flex items-center justify-between gap-4 rounded-md border border-border/50 px-3 py-2">
            <span className="text-muted-foreground">
              Discord bot
              {snapshot.discord.tag ? (
                <span className="ml-2 font-mono text-xs text-muted-foreground/80">
                  {snapshot.discord.tag}
                </span>
              ) : null}
            </span>
            {snapshot.discord.ok || snapshot.discord.error ? (
              <StatusBadge status={snapshot.discord} />
            ) : (
              <Badge variant="outline">Unknown</Badge>
            )}
          </div>
        </CardContent>
        {(snapshot.database.error ||
          snapshot.ingest.error ||
          snapshot.discord.error) && (
          <CardContent className="space-y-2 border-t border-border/50 pt-4 text-sm">
            {snapshot.database.error && (
              <p className="text-red-300">Database: {snapshot.database.error}</p>
            )}
            {snapshot.ingest.error && (
              <p className="text-red-300">Ingest: {snapshot.ingest.error}</p>
            )}
            {snapshot.discord.error && (
              <p className="text-red-300">Discord: {snapshot.discord.error}</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
