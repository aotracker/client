import "server-only";

import os from "node:os";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getIngestSystemInfo } from "@/lib/ingest-api";
import type {
  RuntimeSystemInfo,
  ServiceStatus,
  SystemInfoSnapshot,
} from "@/lib/ops/system-info-shared";

export type {
  CpuInfo,
  DiskInfo,
  MemoryInfo,
  RuntimeSystemInfo,
  ServiceStatus,
  SystemInfoSnapshot,
} from "@/lib/ops/system-info-shared";

function collectApplicationRuntime(): RuntimeSystemInfo {
  const mem = process.memoryUsage();
  const cpus = os.cpus();
  const [load1, load5, load15] = os.loadavg();

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      externalBytes: mem.external,
      systemTotalBytes: os.totalmem(),
      systemFreeBytes: os.freemem(),
    },
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model ?? "unknown",
      loadAvg1m: load1,
      loadAvg5m: load5,
      loadAvg15m: load15,
    },
    disk: null,
  };
}

async function pingDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return {
      ok: false,
      latencyMs: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getSystemInfoSnapshot(): Promise<SystemInfoSnapshot> {
  const ingestConfigured = Boolean(process.env.INGEST_API_URL?.trim());
  const [database, ingestData] = await Promise.all([
    pingDatabase(),
    ingestConfigured ? getIngestSystemInfo() : Promise.resolve(null),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    application: {
      ...collectApplicationRuntime(),
      vercel: process.env.VERCEL === "1",
      vercelRegion: process.env.VERCEL_REGION?.trim() || null,
    },
    database,
    ingest: {
      configured: ingestConfigured,
      reachable: ingestData != null,
      error: ingestData == null && ingestConfigured ? "Ingest API unavailable" : null,
      runtime: ingestData?.runtime ?? null,
      redis: ingestData?.redis ?? null,
    },
  };
}
