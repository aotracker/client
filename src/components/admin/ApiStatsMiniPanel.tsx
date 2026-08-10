import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { regionLabel } from "@/lib/utils";
import type { RegionApiStats } from "@/lib/ops/api-log-queries";

export function ApiStatsMiniPanel({ stats }: { stats: RegionApiStats[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">API stats (last hour)</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No API request logs in the last hour.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((row) => (
              <div
                key={row.region}
                className="rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <p className="font-medium">{regionLabel(row.region)}</p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>{row.requests.toLocaleString()} requests</p>
                  <p>
                    Error rate: {(row.errorRate * 100).toFixed(1)}% (
                    {row.errors})
                  </p>
                  <p>Avg latency: {row.avgLatencyMs}ms</p>
                  <p>
                    p50 {row.p50LatencyMs}ms · p95 {row.p95LatencyMs}ms
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
