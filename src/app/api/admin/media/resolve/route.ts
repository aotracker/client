import { NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/lib/api-route";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { isMediaPlatform, parseTwitchLogin } from "@/lib/media/urls";
import { getTwitchUserByLogin, TwitchHelixError } from "@/lib/twitch/helix";
import { resolveYoutubeChannel, YoutubeApiError } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = await parseJsonBody<{ platform?: string; query?: string }>(
    request
  );
  if (!parsed.ok) return parsed.response;
  const platform = parsed.body.platform;
  const query = parsed.body.query?.trim() ?? "";
  if (!platform || !isMediaPlatform(platform) || !query) {
    return jsonError("platform and query are required", 400);
  }

  try {
    if (platform === "twitch") {
      const login = parseTwitchLogin(query);
      if (!login) return jsonError("invalid_twitch_login", 400);
      const user = await getTwitchUserByLogin(login);
      if (!user) return jsonError("twitch_user_not_found", 404);
      return NextResponse.json({
        platform: "twitch",
        channelId: user.id,
        login: user.login,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    }

    const channel = await resolveYoutubeChannel(query);
    if (!channel) return jsonError("youtube_channel_not_found", 404);
    return NextResponse.json({
      platform: "youtube",
      channelId: channel.id,
      login: channel.handle,
      displayName: channel.displayName,
      avatarUrl: channel.avatarUrl,
    });
  } catch (err) {
    if (err instanceof TwitchHelixError || err instanceof YoutubeApiError) {
      return jsonError(err.message, err.status === 503 ? 503 : 502);
    }
    throw err;
  }
}
