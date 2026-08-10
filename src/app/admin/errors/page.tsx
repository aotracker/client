import { PageHeader } from "@/components/PageSection";
import { OpsEventsFilters } from "@/components/admin/OpsEventsFilters";
import { OpsEventsTable } from "@/components/admin/OpsEventsTable";
import {
  getOpsEvents,
  getOpsEventCountsBySource,
  parseOpsEventsQueryParams,
} from "@/lib/ops/queries";

export const dynamic = "force-dynamic";

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") urlParams.set(key, value);
  }

  const query = parseOpsEventsQueryParams(urlParams);
  const { events, total } = await getOpsEvents(query).catch(() => ({
    events: [],
    total: 0,
  }));

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const countsBySource = await getOpsEventCountsBySource(since24h).catch(
    () => ({})
  );

  const current = {
    severity: query.severity,
    source: query.source,
    region: query.region,
    window: urlParams.get("window") ?? undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ops events"
        description="Centralized worker, ingest, API, and job errors"
      />

      {Object.keys(countsBySource).length > 0 && (
        <p className="text-sm text-muted-foreground">
          Errors in last 24h:{" "}
          {Object.entries(countsBySource)
            .map(([source, count]) => `${source} ${count}`)
            .join(" · ")}
        </p>
      )}

      <OpsEventsFilters current={current} />
      <p className="text-xs text-muted-foreground">
        Showing {events.length} of {total} events
      </p>
      <OpsEventsTable events={events} />
    </div>
  );
}
