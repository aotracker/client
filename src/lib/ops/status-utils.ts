export function getActiveErrorMessage(
  dbState?: {
    lastSuccessAt: Date | null;
    lastErrorAt: Date | null;
    lastErrorMessage: string | null;
  } | null
): string | null {
  if (!dbState?.lastErrorMessage) return null;
  if (
    dbState.lastErrorMessage.includes("failed to ingest") ||
    dbState.lastErrorMessage.includes("returned no data")
  ) {
    return dbState.lastErrorMessage;
  }
  if (!dbState.lastErrorAt) return dbState.lastErrorMessage;
  if (!dbState.lastSuccessAt) return dbState.lastErrorMessage;
  if (dbState.lastSuccessAt > dbState.lastErrorAt) return null;
  return dbState.lastErrorMessage;
}
