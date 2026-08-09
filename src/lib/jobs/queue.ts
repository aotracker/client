export type {
  BattleSyncJobInfo,
  QueueJobSummary,
  QueueStatusSnapshot,
} from "./types";

export {
  ensurePlayerSyncQueued,
  ensurePlayerSyncQueuedAfter,
  ensureGuildSyncQueued,
  ensureGuildSyncQueuedAfter,
  ensureAllianceRefreshQueued,
  ensureAllianceRefreshQueuedAfter,
  ensureKillEventQueued,
  ensureBattleDetailQueued,
  ensureEntityResolveQueued,
  getPlayerSyncJobState,
  getGuildSyncJobState,
  getAllianceRefreshJobState,
  getEntityResolveJobInfo,
  getBattleSyncJobInfo,
  requeueBattleDetail,
  getQueueStatuses,
} from "@/lib/ingest-api";

import { getQueueStatuses as fetchQueueStatuses } from "@/lib/ingest-api";
import { enrichQueueStatusWithEntityNames } from "./enrich-queue-status";
import type { QueueStatusSnapshot } from "./types";

export async function getEnrichedQueueStatuses(): Promise<{
  queue: QueueStatusSnapshot | null;
  fetchedAt: string;
  error: string | null;
}> {
  const status = await fetchQueueStatuses();
  if (!status.queue) return status;
  return {
    ...status,
    queue: await enrichQueueStatusWithEntityNames(status.queue),
  };
}
