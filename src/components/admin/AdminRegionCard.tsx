import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function AdminRegionCard({
  regionLabel: label,
  statusDot,
  liveLabel,
  liveNote,
  circuitOpen,
  lastIngest,
  lastHealthCheck,
  healthCheckOk,
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
  statusDot: "online" | "offline" | "circuit" | "pending";
  liveLabel: string;
  liveNote?: string;
  circuitOpen: boolean;
  lastIngest: Date | null;
  lastHealthCheck?: Date | null;
  healthCheckOk?: boolean;
  failures: string;
  avgLatency: string;
  players: string;
  guilds: string;
  kills: string;
  battles: string;
  activeError: string | null;
  previousError: string | null;
}) {
  const dotClass =
    statusDot === "online"
      ? "bg-green-500"
      : statusDot === "circuit"
        ? "bg-red-500"
        : statusDot === "pending"
          ? "bg-muted-foreground/40 animate-pulse"
          : "bg-yellow-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          {label}
          <span className={`h-3 w-3 rounded-full ${dotClass}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="API health" value={liveLabel} />
        {liveNote && <p className="text-xs text-amber-300">{liveNote}</p>}
        <Row label="Circuit" value={circuitOpen ? "OPEN" : "Closed"} />
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
