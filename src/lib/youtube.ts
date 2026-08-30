import {
  parseYoutubeChannelInput,
  youtubeWatchUrl,
} from "@/lib/media/urls";

export type YoutubeChannel = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
};

export type YoutubeUpload = {
  videoId: string;
  title: string;
  publishedAt: string;
  url: string;
};

export class YoutubeApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "YoutubeApiError";
    this.status = status;
  }
}

function youtubeApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY?.trim() || null;
}

export async function resolveYoutubeChannel(
  raw: string
): Promise<YoutubeChannel | null> {
  const parsed = parseYoutubeChannelInput(raw);
  if (!parsed) return null;
  const key = youtubeApiKey();
  if (!key) {
    throw new YoutubeApiError("YouTube API key is not configured", 503);
  }

  const params = new URLSearchParams({
    part: "snippet",
    key,
  });
  if (parsed.kind === "id") params.set("id", parsed.value);
  else params.set("forHandle", parsed.value);

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new YoutubeApiError(`YouTube channels HTTP ${res.status}`, res.status);
  }
  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        customUrl?: string;
        thumbnails?: { default?: { url?: string } };
      };
    }>;
  };
  const item = json.items?.[0];
  if (!item?.id) return null;
  const custom = item.snippet?.customUrl?.replace(/^@/, "") ?? parsed.value;
  return {
    id: item.id,
    handle: custom,
    displayName: item.snippet?.title?.trim() || custom,
    avatarUrl: item.snippet?.thumbnails?.default?.url?.trim() || null,
  };
}

export async function fetchYoutubeUploads(
  channelId: string,
  limit = 6
): Promise<YoutubeUpload[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    { next: { revalidate: 900 } }
  );
  if (!res.ok) return [];
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(
    0,
    limit
  );
  const uploads: YoutubeUpload[] = [];
  for (const match of entries) {
    const block = match[1] ?? "";
    const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = decodeXml(
      block.match(/<title>([^<]+)<\/title>/)?.[1] ?? ""
    );
    const publishedAt =
      block.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
    if (!videoId) continue;
    uploads.push({
      videoId,
      title: title || videoId,
      publishedAt,
      url: youtubeWatchUrl(videoId),
    });
  }
  return uploads;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
