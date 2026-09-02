import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api-route";
import { getDiscordFeedsList } from "@/lib/discord-feeds-list";

export const dynamic = "force-dynamic";

export async function GET() {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const result = await getDiscordFeedsList(authz.userId);
  if (!result.ok) {
    const status =
      result.error === "not_linked"
        ? 403
        : result.error === "rate_limited"
          ? 429
          : result.error === "load_error"
            ? 500
            : 401;
    return jsonError(result.error, status);
  }

  return NextResponse.json({
    inviteUrl: result.inviteUrl,
    botTokenConfigured: result.botTokenConfigured,
    guilds: result.guilds,
  });
}
