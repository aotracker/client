import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";
import type { OpsEventSeverity, OpsEventSource } from "./events";

export interface OpsEventsQuery {
  limit?: number;
  offset?: number;
  severity?: OpsEventSeverity;
  source?: OpsEventSource;
  region?: AlbionRegion;
  category?: string;
  since?: Date;
}

export type OpsEventRow = typeof schema.opsEvents.$inferSelect;

export async function getOpsEvents(query: OpsEventsQuery = {}): Promise<{
  events: OpsEventRow[];
  total: number;
}> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
  const offset = Math.max(query.offset ?? 0, 0);

  const conditions = [];
  if (query.severity) {
    conditions.push(eq(schema.opsEvents.severity, query.severity));
  }
  if (query.source) {
    conditions.push(eq(schema.opsEvents.source, query.source));
  }
  if (query.region) {
    conditions.push(eq(schema.opsEvents.region, query.region));
  }
  if (query.category) {
    conditions.push(eq(schema.opsEvents.category, query.category));
  }
  if (query.since) {
    conditions.push(gte(schema.opsEvents.createdAt, query.since));
  }

  const where =
    conditions.length > 0 ? and(...conditions) : undefined;

  const [events, totalRow] = await Promise.all([
    db
      .select()
      .from(schema.opsEvents)
      .where(where)
      .orderBy(desc(schema.opsEvents.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(schema.opsEvents)
      .where(where),
  ]);

  return {
    events,
    total: Number(totalRow[0]?.count ?? 0),
  };
}

export async function getRecentOpsEvents(limit = 10): Promise<OpsEventRow[]> {
  return db
    .select()
    .from(schema.opsEvents)
    .orderBy(desc(schema.opsEvents.createdAt))
    .limit(limit);
}

export async function getOpsEventCountsBySource(
  since: Date
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      source: schema.opsEvents.source,
      count: count(),
    })
    .from(schema.opsEvents)
    .where(
      and(
        gte(schema.opsEvents.createdAt, since),
        eq(schema.opsEvents.severity, "error")
      )
    )
    .groupBy(schema.opsEvents.source);

  return Object.fromEntries(
    rows.map((row) => [row.source, Number(row.count)])
  );
}

export function parseOpsEventsQueryParams(
  params: URLSearchParams
): OpsEventsQuery {
  const limit = parseInt(params.get("limit") ?? "50", 10);
  const offset = parseInt(params.get("offset") ?? "0", 10);
  const severity = params.get("severity");
  const source = params.get("source");
  const region = params.get("region");
  const category = params.get("category");
  const sinceParam = params.get("since");

  let since: Date | undefined;
  if (sinceParam) {
    const parsed = new Date(sinceParam);
    if (!Number.isNaN(parsed.getTime())) since = parsed;
  } else {
    const window = params.get("window");
    if (window === "24h") {
      since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (window === "7d") {
      since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (window === "30d") {
      since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  const validSeverity =
    severity === "error" || severity === "warning" || severity === "info"
      ? severity
      : undefined;

  const validSource =
    source === "worker" ||
    source === "ingest" ||
    source === "api" ||
    source === "job" ||
    source === "scheduler"
      ? source
      : undefined;

  const validRegion =
    region && isRegionEnabled(region) ? (region as AlbionRegion) : undefined;

  return {
    limit: Number.isNaN(limit) ? 50 : limit,
    offset: Number.isNaN(offset) ? 0 : offset,
    severity: validSeverity,
    source: validSource,
    region: validRegion,
    category: category?.trim() || undefined,
    since,
  };
}
