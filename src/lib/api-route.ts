import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export type ApiErrorBody = { error: string; message?: string };

export function jsonError(
  error: string,
  status: number,
  message?: string
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = message ? { error, message } : { error };
  return NextResponse.json(body, { status });
}

export type RequireUserResult =
  | {
      ok: true;
      userId: string;
      session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
    }
  | { ok: false; response: NextResponse<ApiErrorBody> };

/** Session gate for signed-in user APIs. Does not replace admin or Discord-manage gates. */
export async function requireUser(): Promise<RequireUserResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  return { ok: true, userId: session.user.id, session };
}

export type ParseJsonResult<T> =
  | { ok: true; body: T }
  | { ok: false; response: NextResponse<ApiErrorBody> };

export async function parseJsonBody<T>(request: Request): Promise<ParseJsonResult<T>> {
  try {
    const body = (await request.json()) as T;
    return { ok: true, body };
  } catch {
    return { ok: false, response: jsonError("Invalid JSON", 400) };
  }
}
