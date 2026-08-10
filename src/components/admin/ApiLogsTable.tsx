import { Badge } from "@/components/ui/badge";
import { RelativeTimeLabel } from "@/components/RelativeTime";
import { regionLabel } from "@/lib/utils";
import type { ApiRequestLogRow } from "@/lib/ops/api-log-queries";
import { ApiLogErrorCell } from "./ApiLogErrorCell";

const STATUS_VARIANT: Record<string, "solo" | "zvz" | "outline"> = {
  success: "solo",
  error: "zvz",
  miss: "outline",
};

export function ApiLogsTable({ logs }: { logs: ApiRequestLogRow[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No API logs match these filters.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Region</th>
            <th className="px-3 py-2">Endpoint</th>
            <th className="px-3 py-2">Latency</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 min-w-[20rem]">Error details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border/50 align-top">
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                <RelativeTimeLabel date={log.createdAt} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {regionLabel(log.region)}
              </td>
              <td className="px-3 py-2 font-mono text-xs break-all">
                {log.endpoint}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{log.latencyMs}ms</td>
              <td className="px-3 py-2">
                <Badge variant={STATUS_VARIANT[log.status] ?? "outline"}>
                  {log.status}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <ApiLogErrorCell log={log} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
