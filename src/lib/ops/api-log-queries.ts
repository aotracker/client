import { and, count, desc, eq, gte, like, sql } from "drizzle-orm";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";

export interface ApiLogsQuery {
  limit?: number;
  offset?: number;
  region?: AlbionRegion;
  status?: "success" | "error" | "miss";
  endpoint?: string;
  since?: Date;
}

export type ApiRequestLogRow = typeof schema.apiRequestLogs.$inferSelect;

export async function getApiRequestLogs(query: ApiLogsQuery = {}): Promise<{
  logs: ApiRequestLogRow[];
  total: number;
}> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
  const offset = Math.max(query.offset ?? 0, 0);

  const conditions = [];
  if (query.region) {
    conditions.push(eq(schema.apiRequestLogs.region, query.region));
  }
  if (query.status) {
    conditions.push(eq(schema.apiRequestLogs.status, query.status));
  }
  if (query.endpoint) {
    conditions.push(like(schema.apiRequestLogs.endpoint, `%${query.endpoint}%`));
  }
  if (query.since) {
    conditions.push(gte(schema.apiRequestLogs.createdAt, query.since));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, totalRow] = await Promise.all([
    db
      .select()
      .from(schema.apiRequestLogs)
      .where(where)
      .orderBy(desc(schema.apiRequestLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(schema.apiRequestLogs)
      .where(where),
  ]);

  return {
    logs,
    total: Number(totalRow[0]?.count ?? 0),
  };
}

export interface RegionApiStats {
  region: AlbionRegion;
  requests: number;
  errors: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
}

export async function getRegionApiStatsSince(
  since: Date
): Promise<RegionApiStats[]> {
  const rows = await db
    .select({
      region: schema.apiRequestLogs.region,
      requests: count(),
      errors: sql<number>`count(*) filter (where ${schema.apiRequestLogs.status} = 'error')`,
      avgLatencyMs: sql<number>`coalesce(round(avg(${schema.apiRequestLogs.latencyMs})), 0)`,
      p50LatencyMs: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${schema.apiRequestLogs.latencyMs}), 0)`,
      p95LatencyMs: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${schema.apiRequestLogs.latencyMs}), 0)`,
    })
    .from(schema.apiRequestLogs)
    .where(gte(schema.apiRequestLogs.createdAt, since))
    .groupBy(schema.apiRequestLogs.region);

  return rows.map((row) => {
    const requests = Number(row.requests);
    const errors = Number(row.errors);
    return {
      region: row.region,
      requests,
      errors,
      errorRate: requests > 0 ? errors / requests : 0,
      avgLatencyMs: Number(row.avgLatencyMs),
      p50LatencyMs: Math.round(Number(row.p50LatencyMs)),
      p95LatencyMs: Math.round(Number(row.p95LatencyMs)),
    };
  });
}

export function parseApiLogsQueryParams(params: URLSearchParams): ApiLogsQuery {
  const limit = parseInt(params.get("limit") ?? "50", 10);
  const offset = parseInt(params.get("offset") ?? "0", 10);
  const region = params.get("region");
  const status = params.get("status");
  const endpoint = params.get("endpoint");
  const sinceParam = params.get("since");

  let since: Date | undefined;
  if (sinceParam) {
    const parsed = new Date(sinceParam);
    if (!Number.isNaN(parsed.getTime())) since = parsed;
  } else {
    const window = params.get("window");
    if (window === "1h") {
      since = new Date(Date.now() - 60 * 60 * 1000);
    } else if (window === "24h") {
      since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (window === "7d") {
      since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  const validStatus =
    status === "success" || status === "error" || status === "miss"
      ? status
      : undefined;

  const validRegion =
    region && isRegionEnabled(region) ? (region as AlbionRegion) : undefined;

  return {
    limit: Number.isNaN(limit) ? 50 : limit,
    offset: Number.isNaN(offset) ? 0 : offset,
    region: validRegion,
    status: validStatus,
    endpoint: endpoint?.trim() || undefined,
    since,
  };
}
