import { NextResponse } from "next/server";
import { requireUser, parseJsonBody, jsonError } from "@/lib/api-route";
import { unlinkSocialProvider } from "@/lib/db/user-data";

const PROVIDERS = new Set(["discord", "google"]);

/** Unlink Discord or Google. Refuses to remove the last sign-in method. */
export async function POST(request: Request) {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody<{ provider?: unknown }>(request);
  if (!parsed.ok) return parsed.response;

  if (
    typeof parsed.body.provider !== "string" ||
    !PROVIDERS.has(parsed.body.provider)
  ) {
    return jsonError("Invalid provider", 400);
  }

  const result = await unlinkSocialProvider(
    authz.userId,
    parsed.body.provider as "discord" | "google"
  );
  if (result === "last") {
    return jsonError(
      "last_provider",
      400,
      "Cannot unlink the last sign-in method"
    );
  }
  if (result === "missing") {
    return jsonError("Provider not linked", 404);
  }
  return NextResponse.json({ ok: true });
}
