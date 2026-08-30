import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { LiveBadge } from "@/components/media/LiveBadge";
import { TwitchWatchButton } from "@/components/media/TwitchWatchButton";
import { listLivePlayers } from "@/lib/db/queries/media";
import { MEDIA_LIVE_CACHE_REVALIDATE_SECONDS, cachedQuery } from "@/lib/cache";
import { playerPath } from "@/lib/seo";
import { twitchChannelUrl } from "@/lib/media/urls";
import type { AlbionRegion } from "@/lib/albion/types";

const cachedLivePlayers = cachedQuery(
  (region: AlbionRegion | "all") => listLivePlayers({ region, limit: 12 }),
  ["media-live-home"],
  MEDIA_LIVE_CACHE_REVALIDATE_SECONDS,
  ["media-live"]
);

export async function WhoIsLiveSection({
  region,
}: {
  region: AlbionRegion | "all";
}) {
  const t = await getTranslations("Media");
  let players: Awaited<ReturnType<typeof listLivePlayers>> = [];
  try {
    players = await cachedLivePlayers(region);
  } catch {
    return null;
  }
  if (players.length === 0) return null;

  return (
    <PageSection title={t("whoIsLive")} description={t("whoIsLiveDescription")}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {players.map((player) => (
          <li key={`${player.region}-${player.playerAlbionId}`}>
            <Card variant="muted">
              <CardContent className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={playerPath(player.region, player.playerName)}
                      className="truncate text-sm font-medium hover:text-primary hover:underline"
                    >
                      {player.playerName}
                    </Link>
                    <LiveBadge label={t("live")} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {player.guildName ? `${player.guildName} · ` : ""}
                    {player.title ?? t("albionOnline")}
                  </p>
                </div>
                <TwitchWatchButton href={twitchChannelUrl(player.login)}>
                  {t("watch")}
                </TwitchWatchButton>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
