import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { unlinkSocialProvider } from "@/lib/db/user-data";

const PROVIDERS = new Set(["discord", "google"]);

/** Unlink Discord or Google. Refuses to remove the last sign-in method. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { provider?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.provider !== "string" || !PROVIDERS.has(body.provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const result = await unlinkSocialProvider(
    session.user.id,
    body.provider as "discord" | "google"
  );
  if (result === "last") {
    return NextResponse.json(
      { error: "last_provider", message: "Cannot unlink the last sign-in method" },
      { status: 400 }
    );
  }
  if (result === "missing") {
    return NextResponse.json({ error: "Provider not linked" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
