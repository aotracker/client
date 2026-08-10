import { PageHeader } from "@/components/PageSection";
import { AdminStatusOverview } from "@/components/admin/AdminStatusOverview";
import { AdminRegionCards } from "@/components/admin/AdminRegionCards";
import { ApiStatsMiniPanel } from "@/components/admin/ApiStatsMiniPanel";
import { RecentOpsEventsPreview } from "@/components/admin/RecentOpsEventsPreview";
import { WorkerQueuesPanel } from "@/components/WorkerQueuesPanel";
import { getRegionEntityCounts } from "@/lib/db/queries";
import { buildAdminSnapshot } from "@/lib/ops/admin-snapshot";
import { getRegionApiStatsSince } from "@/lib/ops/api-log-queries";
import { getRecentOpsEvents } from "@/lib/ops/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let dbError: string | null = null;
  let snapshot: Awaited<ReturnType<typeof buildAdminSnapshot>> | null = null;
  let entityCounts: Awaited<ReturnType<typeof getRegionEntityCounts>> = [];

  try {
    snapshot = await buildAdminSnapshot();
    entityCounts = await getRegionEntityCounts();
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database unavailable";
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recentEvents, apiStats] = await Promise.all([
    getRecentOpsEvents(10).catch(() => []),
    getRegionApiStatsSince(oneHourAgo).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Ingest health, API status, workers, and recent ops events"
      />

      {dbError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Database error: {dbError}
        </div>
      )}

      {snapshot?.globalStatus && (
        <AdminStatusOverview globalStatus={snapshot.globalStatus} />
      )}

      <ApiStatsMiniPanel stats={apiStats} />

      {snapshot && (
        <AdminRegionCards
          syncStates={snapshot.syncStates}
          entityCounts={entityCounts}
        />
      )}

      <RecentOpsEventsPreview events={recentEvents} />

      {snapshot && (
        <WorkerQueuesPanel
          initial={snapshot.queues}
          initialCrons={snapshot.crons}
        />
      )}
    </div>
  );
}
