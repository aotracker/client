import { getTranslations } from "next-intl/server";
import { Radio } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { TwitchEmbed } from "@/components/media/TwitchEmbed";
import {
  getLiveStateForChannels,
  getPlayerMediaLinks,
  listRecentSessionsForChannels,
} from "@/lib/db/queries/media";
import { fetchYoutubeUploads } from "@/lib/youtube";
import { twitchVodUrl } from "@/lib/media/urls";
import type { AlbionRegion } from "@/lib/albion/types";
import { TwitchWatchButton } from "@/components/media/TwitchWatchButton";
import { YoutubeWatchButton } from "@/components/media/YoutubeWatchButton";

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
  const uploads = youtube ? await fetchYoutubeUploads(youtube.channelId, 4) : [];

  return (
    <PageSection title={t("playerSectionTitle")} description={t("playerSectionDescription")}>
      <div className="space-y-4">
        {live && twitch ? (
          <div className="space-y-2">
            {live.title ? (
              <p className="text-sm text-muted-foreground">{live.title}</p>
            ) : null}
            <TwitchEmbed login={twitch.login} />
          </div>
        ) : null}

        {sessions.some((session) => session.vodId) ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("recentBroadcasts")}</h3>
            <ul className="space-y-2">
              {sessions
                .filter((session) => session.vodId)
                .map((session) => (
                  <li key={session.id}>
                    <Card variant="muted">
                      <CardContent className="flex items-center justify-between gap-3 py-2.5">
                        <p className="min-w-0 truncate text-sm">
                          {session.title || t("untitledBroadcast")}
                        </p>
                        <TwitchWatchButton href={twitchVodUrl(session.vodId!)}>
                          {t("watchVod")}
                        </TwitchWatchButton>
                      </CardContent>
                    </Card>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {uploads.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("recentUploads")}</h3>
            <ul className="space-y-2">
              {uploads.map((upload) => (
                <li key={upload.videoId}>
                  <Card variant="muted">
                    <CardContent className="flex items-center justify-between gap-3 py-2.5">
                      <p className="min-w-0 truncate text-sm">{upload.title}</p>
                      <YoutubeWatchButton href={upload.url}>
                        {t("watchYoutube")}
                      </YoutubeWatchButton>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!live && sessions.length === 0 && uploads.length === 0 ? (
          <EmptyState icon={Radio} bordered={false} className="p-0">
            {t("playerEmpty")}
          </EmptyState>
        ) : null}
      </div>
    </PageSection>
  );
}
