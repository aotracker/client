"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RelativeTimeLabel } from "@/components/RelativeTime";
import { regionLabel } from "@/lib/utils";
import type { OpsEventRow } from "@/lib/ops/queries";

const SEVERITY_VARIANT: Record<string, "zvz" | "group" | "outline"> = {
  error: "zvz",
  warning: "group",
  info: "outline",
};

function detailsSummary(details: Record<string, unknown>): string {
  const keys = Object.keys(details);
  if (keys.length === 0) return "No details";
  if (keys.length <= 3) return keys.join(", ");
  return `${keys.slice(0, 3).join(", ")} (+${keys.length - 3} more)`;
}

function OpsEventDetailsCell({
  details,
}: {
  details: Record<string, unknown> | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries =
    details && typeof details === "object" ? Object.entries(details) : [];

  if (entries.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const record = Object.fromEntries(entries) as Record<string, unknown>;

  return (
    <div className="min-w-[18rem] max-w-2xl space-y-1.5">
      <p className="text-xs text-muted-foreground">{detailsSummary(record)}</p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-[11px] text-primary hover:underline"
      >
        {expanded ? "Hide details" : "Show details"}
      </button>
      {expanded && (
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/50 bg-muted/20 p-3 text-[11px] text-muted-foreground">
          {JSON.stringify(record, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function OpsEventsTable({ events }: { events: OpsEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No events match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[64rem] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="whitespace-nowrap px-3 py-2">Time</th>
            <th className="whitespace-nowrap px-3 py-2">Severity</th>
            <th className="whitespace-nowrap px-3 py-2">Source</th>
            <th className="whitespace-nowrap px-3 py-2">Category</th>
            <th className="whitespace-nowrap px-3 py-2">Region</th>
            <th className="min-w-[16rem] px-3 py-2">Message</th>
            <th className="min-w-[18rem] px-3 py-2">Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-border/50 align-top">
              <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                <RelativeTimeLabel date={event.createdAt} />
              </td>
              <td className="px-3 py-2">
                <Badge variant={SEVERITY_VARIANT[event.severity] ?? "outline"}>
                  {event.severity}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-3 py-2">{event.source}</td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {event.category ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {event.region ? regionLabel(event.region) : "—"}
              </td>
              <td className="max-w-xl px-3 py-2">
                <span className="break-words">{event.message}</span>
              </td>
              <td className="px-3 py-2">
                <OpsEventDetailsCell
                  details={
                    event.details && typeof event.details === "object"
                      ? (event.details as Record<string, unknown>)
                      : null
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
