export type IngestEntityType = "player" | "guild" | "alliance" | "kill" | "battle";

export function isJobInProgress(state: string | null | undefined): boolean {
  return state === "waiting" || state === "delayed" || state === "active";
}

export function isPlayerDataIngesting(input: {
  lastSyncedAt: Date | null;
  historyLastSyncedAt: Date | null;
  syncJobState: string | null;
}): boolean {
  if (!input.lastSyncedAt || isJobInProgress(input.syncJobState)) {
    return true;
  }

  return !input.historyLastSyncedAt;
}

export function isGuildDataIngesting(input: {
  lastSyncedAt: Date | null;
  historyLastSyncedAt: Date | null;
  battlesLastSyncedAt?: Date | null;
  syncJobState: string | null;
}): boolean {
  if (!input.lastSyncedAt || isJobInProgress(input.syncJobState)) {
    return true;
  }

  if (!input.historyLastSyncedAt) return true;
  if (input.battlesLastSyncedAt === undefined) return false;
  return !input.battlesLastSyncedAt;
}

export function isAllianceDataIngesting(input: {
  lastSyncedAt: Date | null;
  battlesLastSyncedAt?: Date | null;
  refreshJobState: string | null;
}): boolean {
  if (!input.lastSyncedAt || isJobInProgress(input.refreshJobState)) {
    return true;
  }
  if (input.battlesLastSyncedAt === undefined) return false;
  return !input.battlesLastSyncedAt;
}

export function isKillDataIngesting(jobState: string | null): boolean {
  return isJobInProgress(jobState);
}

export function ingestStatusMessage(entityType: IngestEntityType): string {
  const label =
    entityType === "player"
      ? "Player data"
      : entityType === "guild"
        ? "Guild data"
        : entityType === "alliance"
          ? "Alliance data"
          : entityType === "battle"
            ? "Battle data"
            : "Kill data";

  return `${label} is still being ingested from the Albion API. Refresh in a few minutes.`;
}
