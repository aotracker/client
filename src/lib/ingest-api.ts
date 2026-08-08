import type { AlbionRegion } from "@/lib/albion/types";
import type {
  BattleSyncJobInfo,
  QueueStatusSnapshot,
} from "@/lib/jobs/types";

function getIngestApiUrl(): string | null {
  const url = process.env.INGEST_API_URL?.trim();
  return url || null;
}

function getIngestApiSecret(): string | null {
  const secret = process.env.INGEST_API_SECRET?.trim();
  return secret || null;
}

function isIngestApiConfigured(): boolean {
  if (process.env.NODE_ENV === "development" && !getIngestApiSecret()) {
    return getIngestApiUrl() != null;
  }
  return getIngestApiUrl() != null && getIngestApiSecret() != null;
}

function authHeaders(): HeadersInit {
  const secret = getIngestApiSecret();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

async function postJson<T = { ok: boolean }>(
  path: string,
  body: Record<string, unknown>
): Promise<T | null> {
  const base = getIngestApiUrl();
  if (!base) {
    console.warn("[ingest-api] INGEST_API_URL is not configured");
    return null;
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[ingest-api] POST ${path} failed: ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[ingest-api] POST ${path} error:`, err);
    return null;
  }
}

async function getJson<T>(path: string): Promise<T | null> {
  const base = getIngestApiUrl();
  if (!base) {
    console.warn("[ingest-api] INGEST_API_URL is not configured");
    return null;
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[ingest-api] GET ${path} failed: ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[ingest-api] GET ${path} error:`, err);
    return null;
  }
}

function postJsonFireAndForget(
  path: string,
  body: Record<string, unknown>
): void {
  void postJson(path, body);
}

export async function ensurePlayerSyncQueued(
  region: AlbionRegion,
  albionId: string,
  options?: { immediate?: boolean }
): Promise<void> {
  if (!isIngestApiConfigured()) return;
  await postJson("/jobs/player-sync", {
    region,
    playerId: albionId,
    immediate: options?.immediate === true,
  });
}

export function ensurePlayerSyncQueuedAfter(
  region: AlbionRegion,
  albionId: string,
  options?: { immediate?: boolean }
): void {
  if (!isIngestApiConfigured()) return;
  postJsonFireAndForget("/jobs/player-sync", {
    region,
    playerId: albionId,
    immediate: options?.immediate === true,
  });
}

export async function ensureGuildSyncQueued(
  region: AlbionRegion,
  guildId: string,
  options?: { immediate?: boolean; force?: boolean }
): Promise<void> {
  if (!isIngestApiConfigured()) return;
  await postJson("/jobs/guild-sync", {
    region,
    guildId,
    immediate: options?.immediate === true,
    force: options?.force === true,
  });
}

export function ensureGuildSyncQueuedAfter(
  region: AlbionRegion,
  guildId: string,
  options?: { immediate?: boolean; force?: boolean }
): void {
  if (!isIngestApiConfigured()) return;
  postJsonFireAndForget("/jobs/guild-sync", {
    region,
    guildId,
    immediate: options?.immediate === true,
    force: options?.force === true,
  });
}

export async function ensureAllianceRefreshQueued(
  region: AlbionRegion,
  allianceId: string,
  options?: { immediate?: boolean }
): Promise<void> {
  if (!isIngestApiConfigured()) return;
  await postJson("/jobs/alliance-refresh", {
    region,
    allianceId,
    immediate: options?.immediate === true,
  });
}

export function ensureAllianceRefreshQueuedAfter(
  region: AlbionRegion,
  allianceId: string,
  options?: { immediate?: boolean }
): void {
  if (!isIngestApiConfigured()) return;
  postJsonFireAndForget("/jobs/alliance-refresh", {
    region,
    allianceId,
    immediate: options?.immediate === true,
  });
}

export async function ensureKillEventQueued(
  region: AlbionRegion,
  eventId: number
): Promise<void> {
  if (!isIngestApiConfigured()) return;
  await postJson("/jobs/kill-event", { region, eventId });
}

export async function ensureBattleDetailQueued(
  region: AlbionRegion,
  battleId: number,
  options?: { immediate?: boolean; force?: boolean }
): Promise<void> {
  if (!isIngestApiConfigured()) return;
  await postJson("/jobs/battle-sync", {
    region,
    battleId,
    immediate: options?.immediate === true,
    force: options?.force === true,
  });
}

export async function requeueBattleDetail(
  region: AlbionRegion,
  battleId: number
): Promise<void> {
  if (!isIngestApiConfigured()) return;
  await postJson("/jobs/battle-sync", {
    region,
    battleId,
    requeue: true,
  });
}

export async function getPlayerSyncJobState(
  region: AlbionRegion,
  playerId: string
): Promise<string | null> {
  const data = await getJson<{ state: string | null }>(
    `/jobs/player-sync/${encodeURIComponent(region)}/${encodeURIComponent(playerId)}/state`
  );
  return data?.state ?? null;
}

export async function getGuildSyncJobState(
  region: AlbionRegion,
  guildId: string
): Promise<string | null> {
  const data = await getJson<{ state: string | null }>(
    `/jobs/guild-sync/${encodeURIComponent(region)}/${encodeURIComponent(guildId)}/state`
  );
  return data?.state ?? null;
}

export async function getAllianceRefreshJobState(
  region: AlbionRegion,
  allianceId: string
): Promise<string | null> {
  const data = await getJson<{ state: string | null }>(
    `/jobs/alliance-refresh/${encodeURIComponent(region)}/${encodeURIComponent(allianceId)}/state`
  );
  return data?.state ?? null;
}

export async function getBattleSyncJobInfo(
  region: AlbionRegion,
  battleId: number
): Promise<BattleSyncJobInfo> {
  const empty: BattleSyncJobInfo = {
    state: null,
    lastError: null,
    createdAt: null,
    runAt: null,
    delayMs: null,
    notReadySince: null,
    notReadyDefers: 0,
    waitingOnAlbionApi: false,
    apiWaitMs: null,
    showApiDelayNotice: false,
    detailUnavailable: false,
    detailUnavailableError: null,
  };

  const data = await getJson<BattleSyncJobInfo>(
    `/jobs/battle-sync/${encodeURIComponent(region)}/${battleId}`
  );
  return data ?? empty;
}

export async function getQueueStatuses(): Promise<{
  queue: QueueStatusSnapshot | null;
  fetchedAt: string;
  error: string | null;
}> {
  const data = await getJson<{
    queue: QueueStatusSnapshot | null;
    fetchedAt: string;
    error: string | null;
  }>("/jobs/queues");

  if (!data) {
    return {
      queue: null,
      fetchedAt: new Date().toISOString(),
      error: isIngestApiConfigured()
        ? "Ingest API unavailable"
        : "INGEST_API_URL is not configured",
    };
  }

  return data;
}

export async function triggerSchedulerJob(
  name: "ingest-poll" | "health-check"
): Promise<string | null> {
  const path =
    name === "ingest-poll"
      ? "/jobs/scheduler/ingest-poll"
      : "/jobs/scheduler/health-check";
  const data = await postJson<{ ok: boolean; jobId?: string }>(path, {});
  return data?.jobId ?? null;
}
