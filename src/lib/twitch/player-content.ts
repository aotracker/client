import {
  MEDIA_CONTENT_CACHE_REVALIDATE_SECONDS,
  cachedQuery,
} from "@/lib/cache";
import {
  getAlbionTwitchGameId,
  getTwitchArchiveVideos,
  getTwitchClipsByBroadcaster,
  twitchCredentials,
  type TwitchClip,
  type TwitchVideo,
} from "@/lib/twitch/helix";

const CLIP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CLIP_WINDOW_COUNT = 4;

async function fetchRecentAlbionClips(
  broadcasterId: string
): Promise<TwitchClip[]> {
  const now = Date.now();
  const [gameId, batches] = await Promise.all([
    getAlbionTwitchGameId(),
    Promise.all(
      Array.from({ length: CLIP_WINDOW_COUNT }, (_, i) => {
        const endedAt = new Date(now - i * CLIP_WINDOW_MS);
        const startedAt = new Date(endedAt.getTime() - CLIP_WINDOW_MS);
        return getTwitchClipsByBroadcaster(broadcasterId, {
          first: 20,
          startedAt,
          endedAt,
        });
      })
    ),
  ]);

  const seen = new Set<string>();
  const clips: TwitchClip[] = [];
  for (const batch of batches) {
    for (const clip of batch) {
      if (clip.gameId !== gameId || seen.has(clip.id)) continue;
      seen.add(clip.id);
      clips.push(clip);
    }
  }
  return clips
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 6);
}

const cachedAlbionClips = cachedQuery(
  fetchRecentAlbionClips,
  ["twitch-albion-clips-recent"],
  MEDIA_CONTENT_CACHE_REVALIDATE_SECONDS,
  ["media-clips"]
);

const cachedArchiveVideos = cachedQuery(
  (userId: string) => getTwitchArchiveVideos(userId, 8),
  ["twitch-archive-videos"],
  MEDIA_CONTENT_CACHE_REVALIDATE_SECONDS,
  ["media-vods"]
);

export async function loadPlayerTwitchContent(channelId: string): Promise<{
  clips: TwitchClip[];
  videos: TwitchVideo[];
}> {
  if (!twitchCredentials()) {
    return { clips: [], videos: [] };
  }
  try {
    const [clips, videos] = await Promise.all([
      cachedAlbionClips(channelId),
      cachedArchiveVideos(channelId),
    ]);
    return { clips, videos };
  } catch {
    return { clips: [], videos: [] };
  }
}
