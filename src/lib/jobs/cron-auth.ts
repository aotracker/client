import { cookies } from "next/headers";

export const OPS_COOKIE_NAME = "ao_ops";

function getCronSecret(): string | null {
  return process.env.CRON_SECRET ?? null;
}

/** Dev: allow when CRON_SECRET is unset. */
export function isOpsAuthDisabled(): boolean {
  return !getCronSecret() && process.env.NODE_ENV === "development";
}

export function verifyCronRequest(request: Request): boolean {
  if (isOpsAuthDisabled()) return true;

  const secret = getCronSecret();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("key") === secret) return true;

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${OPS_COOKIE_NAME}=`));
    if (match) {
      const value = decodeURIComponent(match.slice(OPS_COOKIE_NAME.length + 1));
      if (value === secret) return true;
    }
  }

  return false;
}

/** Server Components / Route Handlers using next/headers cookies. */
export async function verifyOpsAccess(request?: Request): Promise<boolean> {
  if (isOpsAuthDisabled()) return true;

  const secret = getCronSecret();
  if (!secret) return false;

  if (request) {
    if (verifyCronRequest(request)) return true;
  }

  const jar = await cookies();
  const cookieVal = jar.get(OPS_COOKIE_NAME)?.value;
  return cookieVal === secret;
}

export function opsCookieOptions(secret: string) {
  return {
    name: OPS_COOKIE_NAME,
    value: secret,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function getExpectedOpsSecret(): string | null {
  return getCronSecret();
}
