import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelativeTimeLabel } from "@/components/RelativeTime";
import { regionLabel } from "@/lib/utils";
import type { OpsEventRow } from "@/lib/ops/queries";

const SEVERITY_VARIANT: Record<string, "zvz" | "group" | "outline"> = {
  error: "zvz",
  warning: "group",
  info: "outline",
};

export function RecentOpsEventsPreview({ events }: { events: OpsEventRow[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Recent errors</CardTitle>
        <Link
          href="/admin/errors"
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ops events recorded.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={SEVERITY_VARIANT[event.severity] ?? "outline"}>
                    {event.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {event.source}
                    {event.category ? ` · ${event.category}` : ""}
                    {event.region ? ` · ${regionLabel(event.region)}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <RelativeTimeLabel date={event.createdAt} />
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground/90 line-clamp-2">
                  {event.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
