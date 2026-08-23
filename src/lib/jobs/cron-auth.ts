import { cookies } from "next/headers";

/**
 * Machine ops auth for /api/cron/* (and optional Bearer on admin APIs).
 * Human admin login uses Better Auth Discord + users.is_admin — not this cookie.
 */

function getCronSecret(): string | null {
  return process.env.CRON_SECRET ?? null;
}

/** Dev: allow when CRON_SECRET is unset. */
export function isOpsAuthDisabled(): boolean {
  return !getCronSecret() && process.env.NODE_ENV === "development";
}

/**
 * Accepts Bearer CRON_SECRET or ?key=CRON_SECRET.
 * Cookie path removed — humans use Discord admin login.
 */
export function verifyCronRequest(request: Request): boolean {
  if (isOpsAuthDisabled()) return true;

  const secret = getCronSecret();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("key") === secret) return true;

  return false;
}

export function getExpectedOpsSecret(): string | null {
  return getCronSecret();
}

/** @deprecated Human ops cookie login removed — use Discord admin. */
export async function verifyOpsAccess(_request?: Request): Promise<boolean> {
  void _request;
  void cookies;
  return false;
}
