import { eq } from "drizzle-orm";
import { auth, getSession, isSocialAuthConfigured } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { isOpsAuthDisabled, verifyCronRequest } from "@/lib/jobs/cron-auth";

export type AdminAuthResult =
  | { ok: true; via: "session" | "cron" | "dev"; userId?: string }
  | { ok: false };

/** Re-read isAdmin from DB (authoritative for admin APIs). */
export async function userIsAdmin(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ isAdmin: schema.user.isAdmin })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  return Boolean(row?.isAdmin);
}

/**
 * Human admin UI gate: Better Auth session with isAdmin.
 * When social auth is not configured and CRON_SECRET is unset (local dev),
 * allow the admin shell so operators can still work offline.
 */
export async function verifyAdminSession(): Promise<AdminAuthResult> {
  if (isOpsAuthDisabled() && !isSocialAuthConfigured()) {
    return { ok: true, via: "dev" };
  }

  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false };
  }
  const sessionAdmin = Boolean(
    (session.user as { isAdmin?: boolean }).isAdmin
  );
  const isAdmin = sessionAdmin || (await userIsAdmin(session.user.id));
  if (!isAdmin) return { ok: false };
  return { ok: true, via: "session", userId: session.user.id };
}

/**
 * Admin API gate: admin session (DB re-check) OR CRON_SECRET Bearer.
 */
export async function verifyAdminRequest(
  request: Request
): Promise<AdminAuthResult> {
  if (isOpsAuthDisabled()) {
    return { ok: true, via: "dev" };
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${secret}`) {
      return { ok: true, via: "cron" };
    }
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return { ok: false };

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) return { ok: false };

  return { ok: true, via: "session", userId: session.user.id };
}

/** Cron / machine-only routes — Bearer or ?key= CRON_SECRET. */
export function verifyMachineCronRequest(request: Request): boolean {
  return verifyCronRequest(request);
}
