import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RegionApiHealthLabel } from "@/lib/health/sync-status";
import { formatRelativeTime } from "@/lib/utils";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function healthBadgeVariant(
  label: RegionApiHealthLabel
): "solo" | "zvz" | "outline" {
  if (label === "healthy") return "solo";
  if (label === "delayed") return "outline";
  return "zvz";
}

const STATUS_LABEL: Record<RegionApiHealthLabel, string> = {
  healthy: "Healthy",
  delayed: "Delayed",
  unreachable: "Unreachable",
  cooling_down: "Cooling down",
};

export function AdminRegionCard({
  regionLabel: label,
  apiHealthLabel,
  liveLabel,
  liveNote,
  circuitOpen,
  lastIngest,
  lastHealthCheck,
  healthCheckOk,
  latestKillAt,
  issues,
  failures,
  avgLatency,
  players,
  guilds,
  kills,
  battles,
  activeError,
  previousError,
}: {
  regionLabel: string;
  apiHealthLabel: RegionApiHealthLabel;
  liveLabel: string;
  liveNote?: string;
  circuitOpen: boolean;
  lastIngest: Date | null;
  lastHealthCheck?: Date | null;
  healthCheckOk?: boolean;
  latestKillAt: Date | null;
  issues: string[];
  failures: string;
  avgLatency: string;
  players: string;
  guilds: string;
  kills: string;
  battles: string;
  activeError: string | null;
  previousError: string | null;
}) {
  const apiHealthText = STATUS_LABEL[apiHealthLabel];
  const badgeVariant = healthBadgeVariant(apiHealthLabel);
  const dotClass =
    apiHealthLabel === "healthy"
      ? "bg-green-500"
      : apiHealthLabel === "delayed"
        ? "bg-amber-500"
        : apiHealthLabel === "cooling_down"
          ? "bg-red-500"
          : "bg-yellow-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            {label}
            <span className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`} />
          </span>
          <Badge variant={badgeVariant}>{apiHealthText}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Connectivity" value={liveLabel} />
        {liveNote && <p className="text-xs text-amber-300">{liveNote}</p>}
        <Row label="Circuit" value={circuitOpen ? "Open" : "Closed"} />
        <Row
          label="Last ingest"
          value={lastIngest ? formatRelativeTime(lastIngest) : "—"}
        />
        {lastHealthCheck != null && (
          <Row
            label="Health check"
            value={`${healthCheckOk ? "OK" : "Failed"} · ${formatRelativeTime(lastHealthCheck)}`}
          />
        )}
        <Row
          label="Latest kill"
          value={latestKillAt ? formatRelativeTime(latestKillAt) : "Never"}
        />
        {issues.length > 0 && (
          <p className="text-xs text-amber-400">
            Issues: {issues.join(", ").replaceAll("_", " ")}
          </p>
        )}
        <Row label="Failures" value={failures} />
        <Row label="Avg latency" value={avgLatency} />
        <div className="my-2 border-t border-border/50" />
        <Row label="Players tracked" value={players} />
        <Row label="Guilds tracked" value={guilds} />
        <Row label="Kills tracked" value={kills} />
        <Row label="Battles tracked" value={battles} />
        {activeError && (
          <p className="mt-2 rounded bg-muted/50 p-2 text-xs text-red-300">
            {activeError}
          </p>
        )}
        {previousError && (
          <p className="mt-2 rounded bg-muted/30 p-2 text-xs text-muted-foreground">
            Previous issue (resolved): {previousError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
