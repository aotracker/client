import { getTranslations } from "next-intl/server";
import { Radio } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/EmptyState";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiveBadge } from "@/components/media/LiveBadge";
import { MediaChannelLinks } from "@/components/media/MediaChannelLinks";
import { TwitchWatchButton } from "@/components/media/TwitchWatchButton";
import {
  getGuildMediaPins,
  listLiveAllianceMembers,
  listLiveGuildMembers,
  listRecentAllianceMemberSessions,
  listRecentGuildMemberSessions,
  listRecentSessionsForChannels,
  type GuildMediaPinRow,
  type GuildMemberSession,
  type LivePlayerCard,
  type MediaStreamSessionRow,
} from "@/lib/db/queries/media";
import { fetchYoutubeUploads } from "@/lib/youtube";
import { playerPath } from "@/lib/seo";
import { twitchChannelUrl, twitchVodUrl } from "@/lib/media/urls";
import type { AlbionRegion } from "@/lib/albion/types";

type YoutubeUpload = { videoId: string; url: string; title: string };

async function OrgMediaBody({
  title,
  description,
  emptyLabel,
  pins,
  liveMembers,
  sessions,
  memberVods,
  uploads,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  pins: GuildMediaPinRow[];
  liveMembers: LivePlayerCard[];
  sessions: MediaStreamSessionRow[];
  memberVods: GuildMemberSession[];
  uploads: YoutubeUpload[];
}) {
  const t = await getTranslations("Media");
  const empty =
    pins.length === 0 &&
    liveMembers.length === 0 &&
    sessions.length === 0 &&
    memberVods.length === 0 &&
    uploads.length === 0;
  if (empty) {
    return (
      <PageSection title={title} description={description}>
        <EmptyState icon={Radio}>{emptyLabel}</EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection title={title} description={description}>
      <div className="space-y-4">
        {pins.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("official")}
            </span>
            <MediaChannelLinks
              links={pins}
              twitchLabel={t("twitch")}
              youtubeLabel={t("youtube")}
            />
          </div>
        ) : null}

        {liveMembers.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("liveMembers")}</h3>
            <ul className="space-y-2">
              {liveMembers.map((member) => (
                <li key={member.playerAlbionId}>
                  <Card variant="muted">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={playerPath(member.region, member.playerName)}
                            className="text-sm font-medium hover:text-primary hover:underline"
                          >
                            {member.playerName}
                          </Link>
                          <LiveBadge label={t("live")} />
                        </div>
                        {member.title ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {member.title}
                          </p>
                        ) : null}
                      </div>
                      <TwitchWatchButton href={twitchChannelUrl(member.login)}>
                        {t("watch")}
                      </TwitchWatchButton>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {sessions.some((session) => session.vodId) ||
        memberVods.length > 0 ? (
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
              {memberVods.map((session) => (
                <li key={session.id}>
                  <Card variant="muted">
                    <CardContent className="flex items-center justify-between gap-3 py-2.5">
                      <p className="min-w-0 truncate text-sm">
                        {session.playerName}
                        {session.title ? ` · ${session.title}` : ""}
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
                  <Button
                    href={upload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                    variant="outline"
                  >
                    {upload.title}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}

export async function GuildMediaSection({
  region,
  guildAlbionId,
}: {
  region: AlbionRegion;
  guildAlbionId: string;
}) {
  const t = await getTranslations("Media");
  const [pins, liveMembers, memberSessions] = await Promise.all([
    getGuildMediaPins(region, guildAlbionId),
    listLiveGuildMembers(region, guildAlbionId),
    listRecentGuildMemberSessions(region, guildAlbionId, 8),
  ]);

  const twitchPin = pins.find((pin) => pin.platform === "twitch");
  const youtubePin = pins.find((pin) => pin.platform === "youtube");
  const sessions = twitchPin
    ? await listRecentSessionsForChannels(
        [{ platform: "twitch", channelId: twitchPin.channelId }],
        4
      )
    : [];
  const memberVods = memberSessions.filter(
    (session) => session.channelId !== twitchPin?.channelId
  );
  const uploads = youtubePin
    ? await fetchYoutubeUploads(youtubePin.channelId, 4)
    : [];

  return (
    <OrgMediaBody
      title={t("guildSectionTitle")}
      description={t("guildSectionDescription")}
      emptyLabel={t("guildEmpty")}
      pins={pins}
      liveMembers={liveMembers}
      sessions={sessions}
      memberVods={memberVods}
      uploads={uploads}
    />
  );
}

export async function AllianceMediaSection({
  region,
  allianceId,
}: {
  region: AlbionRegion;
  allianceId: string;
}) {
  const t = await getTranslations("Media");
  const [liveMembers, memberVods] = await Promise.all([
    listLiveAllianceMembers(region, allianceId),
    listRecentAllianceMemberSessions(region, allianceId, 8),
  ]);

  return (
    <OrgMediaBody
      title={t("allianceSectionTitle")}
      description={t("allianceSectionDescription")}
      emptyLabel={t("allianceEmpty")}
      pins={[]}
      liveMembers={liveMembers}
      sessions={[]}
      memberVods={memberVods}
      uploads={[]}
    />
  );
}
