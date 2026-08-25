type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** In-memory fixed window. Returns false when the key is over the limit. */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function rateLimitRetryAfterSec(
  key: string,
  windowMs: number
): number {
  const current = buckets.get(key);
  if (!current) return Math.ceil(windowMs / 1000);
  return Math.max(1, Math.ceil((current.resetAt - Date.now()) / 1000));
}
