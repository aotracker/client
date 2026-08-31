import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Radio } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import {
  getLiveStateForChannels,
  getPlayerMediaLinks,
  listRecentSessionsForChannels,
} from "@/lib/db/queries/media";
import { RelativeTime } from "@/components/RelativeTime";
import { fetchYoutubeUploads } from "@/lib/youtube";
import {
  sizedTwitchThumbnail,
  twitchChannelUrl,
  twitchVodUrl,
  youtubeThumbnailUrl,
} from "@/lib/media/urls";
import { loadPlayerTwitchContent } from "@/lib/twitch/player-content";
import type { AlbionRegion } from "@/lib/albion/types";
import { LiveBadge } from "@/components/media/LiveBadge";
import { TwitchWatchButton } from "@/components/media/TwitchWatchButton";
import { YoutubeWatchButton } from "@/components/media/YoutubeWatchButton";
import type { TwitchClip } from "@/lib/twitch/helix";

const ROW_THUMB_WIDTH = 160;
const ROW_THUMB_HEIGHT = 90;
const CLIP_THUMB_WIDTH = 440;
const CLIP_THUMB_HEIGHT = 248;

export async function PlayerMediaSection({
  region,
  playerAlbionId,
}: {
  region: AlbionRegion;
  playerAlbionId: string;
}) {
  const t = await getTranslations("Media");
  const links = await getPlayerMediaLinks(region, playerAlbionId);
  if (links.length === 0) return null;

  const twitch = links.find((link) => link.platform === "twitch");
  const youtube = links.find((link) => link.platform === "youtube");
  const liveRows = await getLiveStateForChannels(
    links.map((link) => ({
      platform: link.platform,
      channelId: link.channelId,
    }))
  );
  const live = liveRows.find(
    (row) => row.platform === "twitch" && row.isLive && row.channelId === twitch?.channelId
  );
  const sessions = twitch
    ? await listRecentSessionsForChannels(
        [{ platform: "twitch", channelId: twitch.channelId }],
        4
      )
    : [];
  const vods = sessions.filter((session) => session.vodId);
  const twitchContent = twitch
    ? await loadPlayerTwitchContent(twitch.channelId)
    : { clips: [], videos: [] };
  const videosById = new Map(
    twitchContent.videos.map((video) => [video.id, video])
  );
  const uploads = youtube ? await fetchYoutubeUploads(youtube.channelId, 4) : [];

  const empty =
    !live &&
    twitchContent.clips.length === 0 &&
    vods.length === 0 &&
    uploads.length === 0;

  return (
    <PageSection title={t("playerSectionTitle")} description={t("playerSectionDescription")}>
      <div className="space-y-4">
        {live && twitch ? (
          <MediaThumbRow
            href={twitchChannelUrl(twitch.login)}
            thumbnailUrl={sizedTwitchThumbnail(
              live.thumbnailUrl,
              ROW_THUMB_WIDTH,
              ROW_THUMB_HEIGHT
            )}
            title={live.title || t("albionOnline")}
            badge={<LiveBadge label={t("live")} />}
            action={
              <TwitchWatchButton href={twitchChannelUrl(twitch.login)}>
                {t("watch")}
              </TwitchWatchButton>
            }
          />
        ) : null}

        {twitchContent.clips.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("recentClips")}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {twitchContent.clips.map((clip) => (
                <li key={clip.id}>
                  <ClipCard clip={clip} watchLabel={t("watch")} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {vods.length > 0 && twitch ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("recentBroadcasts")}</h3>
            <ul className="space-y-2">
              {vods.map((session) => {
                const href = twitchVodUrl(session.vodId!);
                const helix = videosById.get(session.vodId!);
                return (
                  <li key={session.id}>
                    <MediaThumbRow
                      href={href}
                      thumbnailUrl={sizedTwitchThumbnail(
                        helix?.thumbnailUrl,
                        ROW_THUMB_WIDTH,
                        ROW_THUMB_HEIGHT
                      )}
                      title={session.title || helix?.title || t("untitledBroadcast")}
                      date={session.startedAt}
                      action={
                        <TwitchWatchButton href={href}>{t("watchVod")}</TwitchWatchButton>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {uploads.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("recentUploads")}</h3>
            <ul className="space-y-2">
              {uploads.map((upload) => (
                <li key={upload.videoId}>
                  <MediaThumbRow
                    href={upload.url}
                    thumbnailUrl={youtubeThumbnailUrl(upload.videoId)}
                    title={upload.title}
                    date={upload.publishedAt || null}
                    action={
                      <YoutubeWatchButton href={upload.url}>
                        {t("watchYoutube")}
                      </YoutubeWatchButton>
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {empty ? (
          <EmptyState icon={Radio} bordered={false} className="p-0">
            {t("playerEmpty")}
          </EmptyState>
        ) : null}
      </div>
    </PageSection>
  );
}

function MediaThumbRow({
  href,
  thumbnailUrl,
  title,
  date,
  badge,
  action,
}: {
  href: string;
  thumbnailUrl: string | null;
  title: string;
  date?: Date | string | null;
  badge?: ReactNode;
  action: ReactNode;
}) {
  return (
    <Card variant="muted">
      <CardContent className="flex items-center gap-3 py-2.5">
        {thumbnailUrl ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt=""
              className="aspect-video h-10 rounded-md object-cover"
            />
          </a>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-sm">{title}</p>
            {badge}
          </div>
          {date ? (
            <RelativeTime date={date} className="text-xs text-muted-foreground" />
          ) : null}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

function ClipCard({
  clip,
  watchLabel,
}: {
  clip: TwitchClip;
  watchLabel: string;
}) {
  const thumbnailUrl = sizedTwitchThumbnail(
    clip.thumbnailUrl,
    CLIP_THUMB_WIDTH,
    CLIP_THUMB_HEIGHT
  );
  return (
    <Card variant="muted" className="overflow-hidden">
      <a href={clip.url} target="_blank" rel="noopener noreferrer" className="block">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="aspect-video w-full bg-muted/40" />
        )}
      </a>
      <CardContent className="flex items-start justify-between gap-2 py-2.5">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm">{clip.title}</p>
          <RelativeTime
            date={clip.createdAt}
            className="text-xs text-muted-foreground"
          />
        </div>
        <TwitchWatchButton href={clip.url}>{watchLabel}</TwitchWatchButton>
      </CardContent>
    </Card>
  );
}
