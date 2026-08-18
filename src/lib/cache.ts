import { unstable_cache } from "next/cache";

/** Cross-request TTL for the home kill feed (most live public page). */
export const HOME_CACHE_REVALIDATE_SECONDS = 15;

/** Cross-request TTL for leaderboard aggregations and home sidebar stats. */
export const LEADERBOARD_CACHE_REVALIDATE_SECONDS = 30;

/** Cross-request TTL for the public battles list (scalars + feed_preview). */
export const BATTLES_CACHE_REVALIDATE_SECONDS = 15;

/** Cross-request TTL for meta builds (expensive participant aggregation). */
export const BUILDS_CACHE_REVALIDATE_SECONDS = 60;

/** Cross-request TTL for /health counts, sync banner, and latest-kill lag. */
export const HEALTH_CACHE_REVALIDATE_SECONDS = 30;

/**
 * Request-scoped memoization stub — Next.js wraps with `react` cache at the
 * app layer when needed. Prefer `cachedQuery` for cross-request page data.
 */
export function cache<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}

/** Cross-request Data Cache wrapper around a serializable server query. */
export function cachedQuery<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  revalidate: number,
  tags: string[]
): (...args: Args) => Promise<Result> {
  return unstable_cache(fn, keyParts, { revalidate, tags });
}
