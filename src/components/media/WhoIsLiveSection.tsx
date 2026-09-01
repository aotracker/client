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
      <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {players.map((player) => (
          <li
            key={`${player.region}-${player.playerAlbionId}`}
            className="w-72 shrink-0 snap-start sm:w-auto"
          >
            <Card variant="muted" className="h-full overflow-hidden">
              <CardContent className="flex h-full flex-col gap-2 py-2.5 md:flex-row md:items-center md:justify-between md:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      href={playerPath(player.region, player.playerName)}
                      className="min-w-0 truncate text-sm font-medium hover:text-primary hover:underline"
                    >
                      {player.playerName}
                    </Link>
                    <span className="shrink-0">
                      <LiveBadge label={t("live")} />
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {player.guildName ? `${player.guildName} · ` : ""}
                    {player.title ?? t("albionOnline")}
                  </p>
                </div>
                <TwitchWatchButton
                  href={twitchChannelUrl(player.login)}
                  className="w-full md:w-auto"
                >
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
