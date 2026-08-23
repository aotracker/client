"use client";

/** sessionStorage key prefix for one-shot local→server prefs merge. */
export const PREFS_SYNC_FLAG_PREFIX = "aotrackr-prefs-synced-v1:";

export function prefsSyncFlagKey(userId: string): string {
  return `${PREFS_SYNC_FLAG_PREFIX}${userId}`;
}

export function clearPrefsSyncFlag(userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      sessionStorage.removeItem(prefsSyncFlagKey(userId));
      return;
    }
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PREFS_SYNC_FLAG_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}
