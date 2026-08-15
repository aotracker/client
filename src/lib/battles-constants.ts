export const BATTLES_FEED_PAGE_SIZE = 20;
export const MAX_COMBINED_BATTLES = 10;
/** Max alliance/guild names sent to the card; line-fitting decides how many show. */
export const BATTLES_FEED_PREVIEW_LIMIT = 24;
/** Time proximity window for related-battle suggestions (±60 minutes). */
export const RELATED_BATTLE_WINDOW_MS = 60 * 60 * 1000;

/** Albion `/battles?sort=recent` page size per region during ingest. */
export const RECENT_BATTLES_POLL_LIMIT = 50;
/** Keep recent-list battles with fame strictly above this (i.e. totalFame > 0). */
export const RECENT_BATTLES_MIN_FAME = 0;
/** Minimum players to persist a battle row (ingest + battles feed floor). */
export const RECENT_BATTLES_MIN_PLAYERS = 10;

export const BATTLES_FEED_MIN_PLAYERS_PARAM = "minPlayers";

export function battleMeetsRecentIngestThreshold(
  players: number | null | undefined
): boolean {
  return players != null && players >= RECENT_BATTLES_MIN_PLAYERS;
}

/** Parse `?minPlayers=` for the battles feed. Invalid or below the floor → 10. */
export function parseBattlesMinPlayers(
  value: string | undefined | null
): number {
  if (value == null || value.trim() === "") {
    return RECENT_BATTLES_MIN_PLAYERS;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return RECENT_BATTLES_MIN_PLAYERS;
  return Math.max(RECENT_BATTLES_MIN_PLAYERS, Math.trunc(parsed));
}
