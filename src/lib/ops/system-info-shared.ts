export type MemoryInfo = {
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
  systemTotalBytes: number;
  systemFreeBytes: number;
};

export type CpuInfo = {
  cores: number;
  model: string;
  loadAvg1m: number;
  loadAvg5m: number;
  loadAvg15m: number;
};

export type DiskInfo = {
  mount: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
};

export type RuntimeSystemInfo = {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  memory: MemoryInfo;
  cpu: CpuInfo;
  disk: DiskInfo | null;
};

export type ServiceStatus = {
  ok: boolean;
  latencyMs: number | null;
  error: string | null;
};

export type SystemInfoSnapshot = {
  fetchedAt: string;
  application: RuntimeSystemInfo & {
    vercel: boolean;
    vercelRegion: string | null;
  };
  database: ServiceStatus;
  ingest: {
    configured: boolean;
    reachable: boolean;
    error: string | null;
    runtime: RuntimeSystemInfo | null;
    redis: ServiceStatus | null;
  };
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}

export function memoryUsagePercent(usedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0;
  return Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100));
}
