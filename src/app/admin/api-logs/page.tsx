import { PageHeader } from "@/components/PageSection";
import { ApiLogsFilters } from "@/components/admin/ApiLogsFilters";
import { ApiLogsTable } from "@/components/admin/ApiLogsTable";
import {
  getApiRequestLogs,
  parseApiLogsQueryParams,
} from "@/lib/ops/api-log-queries";

export const dynamic = "force-dynamic";

export default async function AdminApiLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") urlParams.set(key, value);
  }
  if (!urlParams.has("window")) {
    urlParams.set("window", "1h");
  }

  const query = parseApiLogsQueryParams(urlParams);
  const { logs, total } = await getApiRequestLogs(query).catch(() => ({
    logs: [],
    total: 0,
  }));

  const current = {
    status: query.status,
    region: query.region,
    window: urlParams.get("window") ?? "1h",
    endpoint: query.endpoint,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API request logs"
        description="Albion gameinfo API call audit trail (retained ~7 days)"
      />

      <ApiLogsFilters current={current} />
      <p className="text-xs text-muted-foreground">
        Showing {logs.length} of {total} requests. Logs older than 7 days are
        purged automatically.
      </p>
      <ApiLogsTable logs={logs} />
    </div>
  );
}
