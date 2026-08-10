import { Badge } from "@/components/ui/badge";
import { RelativeTimeLabel } from "@/components/RelativeTime";
import { regionLabel } from "@/lib/utils";
import type { OpsEventRow } from "@/lib/ops/queries";

const SEVERITY_VARIANT: Record<string, "zvz" | "group" | "outline"> = {
  error: "zvz",
  warning: "group",
  info: "outline",
};

export function OpsEventsTable({ events }: { events: OpsEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No events match these filters.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Severity</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Region</th>
            <th className="px-3 py-2">Message</th>
            <th className="px-3 py-2">Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-border/50 align-top">
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                <RelativeTimeLabel date={event.createdAt} />
              </td>
              <td className="px-3 py-2">
                <Badge variant={SEVERITY_VARIANT[event.severity] ?? "outline"}>
                  {event.severity}
                </Badge>
              </td>
              <td className="px-3 py-2">{event.source}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {event.category ?? "—"}
              </td>
              <td className="px-3 py-2">
                {event.region ? regionLabel(event.region) : "—"}
              </td>
              <td className="px-3 py-2 max-w-md">
                <span className="line-clamp-3">{event.message}</span>
              </td>
              <td className="px-3 py-2 max-w-xs">
                {event.details && Object.keys(event.details).length > 0 ? (
                  <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
