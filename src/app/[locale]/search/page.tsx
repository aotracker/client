import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { searchLocal } from "@/lib/db/queries";
import {
  ensureLiveSearchQueued,
  getLiveSearchJobInfo,
} from "@/lib/ingest-api";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import {
  isLiveSearchInProgress,
  resolveLiveSearchRegions,
} from "@/lib/search/live-search";
import { Badge } from "@/components/ui/badge";
import { LiveBadge } from "@/components/media/LiveBadge";
import { TwitchIcon } from "@/components/media/TwitchIcon";
import { YoutubeIcon } from "@/components/media/YoutubeIcon";
import { CachedSourceIcon } from "@/components/search/CachedSourceIcon";
import {
  getLiveStateForChannels,
  getPlayerMediaLinksForPlayers,
} from "@/lib/db/queries/media";
import { Card, CardContent } from "@/components/ui/card";
import { InlineAlert } from "@/components/InlineAlert";
import { PageHeader, PageSection } from "@/components/PageSection";
import { SearchForm } from "@/components/SearchForm";
import { SearchLivePoller } from "@/components/SearchLivePoller";
import { formatFame, regionLabel } from "@/lib/utils";
import { buildPageMetadata, guildPath, NOINDEX_FOLLOW, playerPath } from "@/lib/seo";
import { resolveServerFeedRegion } from "@/lib/region-preference-server";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; region?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Search" });

  return buildPageMetadata({
    title: t("title"),
    description: t("metaDescription"),
    canonicalPath: "/search",
    robots: NOINDEX_FOLLOW,
    locale,
  });
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Search");
  const tCommon = await getTranslations("Common");
  const tMedia = await getTranslations("Media");

  const search = await searchParams;
  const query = search.q?.trim() ?? "";
  const preferredRegion = await resolveServerFeedRegion(search.region);
  const liveRegions = resolveLiveSearchRegions(null);

  if (!query) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("description")} />
        <SearchForm
          initialRegion={preferredRegion}
          regions={ENABLED_REGIONS}
        />
      </div>
    );
  }

  let localResults = {
    players: [] as Awaited<ReturnType<typeof searchLocal>>["players"],
    guilds: [] as Awaited<ReturnType<typeof searchLocal>>["guilds"],
    alliances: [] as Awaited<ReturnType<typeof searchLocal>>["alliances"],
  };
  let searchError: string | null = null;
  let liveSearch = {
    state: null as string | null,
    playersFound: null as number | null,
    guildsFound: null as number | null,
    regionsSearched: liveRegions,
    lastError: null as string | null,
    searching: false,
  };

  try {
    await ensureLiveSearchQueued(query, liveRegions, { immediate: true });
    const jobInfo = await getLiveSearchJobInfo(query, liveRegions);
    liveSearch = {
      ...jobInfo,
      searching: isLiveSearchInProgress(jobInfo.state),
    };
  } catch {
    // Ingest unavailable — local search still works.
  }

  try {
    localResults = await searchLocal(query);
  } catch (error) {
    searchError =
      error instanceof Error ? error.message : t("temporarilyUnavailable");
  }

  const hasResults =
    localResults.players.length > 0 ||
    localResults.guilds.length > 0 ||
    localResults.alliances.length > 0;

  const playerMedia = await getPlayerMediaLinksForPlayers(
    localResults.players.map((player) => ({
      region: player.region,
      albionId: player.albionId,
    }))
  );
  const mediaByPlayer = new Map(
    playerMedia.map((link) => [
      `${link.region}:${link.playerAlbionId}:${link.platform}`,
      link,
    ])
  );
  const liveRows = await getLiveStateForChannels(
    playerMedia
      .filter((link) => link.platform === "twitch")
      .map((link) => ({
        platform: link.platform,
        channelId: link.channelId,
      }))
  );
  const liveChannels = new Set(
    liveRows
      .filter((row) => row.isLive)
      .map((row) => `${row.platform}:${row.channelId}`)
  );
  const livePlayerKeys = new Set(
    playerMedia
      .filter(
        (link) =>
          link.platform === "twitch" &&
          liveChannels.has(`twitch:${link.channelId}`)
      )
      .map((link) => `${link.region}:${link.playerAlbionId}`)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("resultsTitle")}
        description={t("resultsDescription", { query })}
      />

      <SearchForm
        initialQuery={query}
        initialRegion={preferredRegion}
        regions={ENABLED_REGIONS}
      />

      <SearchLivePoller
        query={query}
        regions={liveRegions}
        searching={liveSearch.searching}
        playersFound={liveSearch.playersFound}
        guildsFound={liveSearch.guildsFound}
      />

      {searchError && (
        <InlineAlert variant="warning" className="p-3">
          {searchError}
        </InlineAlert>
      )}

      {ENABLED_REGIONS.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noRegions")}</p>
      )}

      <PageSection title={t("players")}>
        <div className="space-y-2">
          {localResults.players.map((player) => (
            <Card
              key={player.id}
              className="transition-colors hover:border-primary/40"
            >
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={playerPath(player.region, player.name)}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {player.name}
                    </Link>
                    {mediaByPlayer.has(`${player.region}:${player.albionId}:twitch`) ? (
                      <Badge
                        variant="outline"
                        size="sm"
                        className="gap-0.5 border-twitch/40 text-twitch"
                      >
                        <TwitchIcon className="size-2.5 shrink-0" />
                        {tMedia("twitch")}
                      </Badge>
                    ) : null}
                    {livePlayerKeys.has(`${player.region}:${player.albionId}`) ? (
                      <LiveBadge label={tMedia("live")} />
                    ) : null}
                    {mediaByPlayer.has(`${player.region}:${player.albionId}:youtube`) ? (
                      <Badge
                        variant="outline"
                        size="sm"
                        className="gap-0.5 border-youtube/40 text-youtube"
                      >
                        <YoutubeIcon className="size-2.5 shrink-0" />
                        {tMedia("youtube")}
                      </Badge>
                    ) : null}
                    <CachedSourceIcon label={tCommon("labels.cached")} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {regionLabel(player.region)}
                    {player.guild && (
                      <>
                        {" · "}
                        {player.guild.albionId ? (
                          <Link
                            href={guildPath(player.region, player.guild.name)}
                            className="hover:text-primary hover:underline"
                          >
                            {player.guild.name}
                          </Link>
                        ) : (
                          player.guild.name
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>
                    {tCommon("labels.killFameWithUnit", {
                      value: formatFame(player.killFame),
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {localResults.players.length === 0 && !liveSearch.searching && (
            <p className="text-muted-foreground">{t("noPlayers")}</p>
          )}
          {localResults.players.length === 0 && liveSearch.searching && (
            <p className="text-muted-foreground">{t("noPlayersYet")}</p>
          )}
        </div>
      </PageSection>

      <PageSection title={t("guilds")}>
        <div className="space-y-2">
          {localResults.guilds.map((guild) => (
            <Link
              key={guild.id}
              href={guildPath(guild.region, guild.name)}
            >
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{guild.name}</p>
                    <CachedSourceIcon label={tCommon("labels.cached")} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {regionLabel(guild.region)} ·{" "}
                    {tCommon("labels.killFameWithUnit", {
                      value: formatFame(guild.killFame),
                    })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}

          {localResults.guilds.length === 0 && !liveSearch.searching && (
            <p className="text-muted-foreground">{t("noGuilds")}</p>
          )}
          {localResults.guilds.length === 0 && liveSearch.searching && (
            <p className="text-muted-foreground">{t("noGuildsYet")}</p>
          )}
        </div>
      </PageSection>

      <PageSection title={t("alliances")}>
        <div className="space-y-2">
          {localResults.alliances.map((alliance) => (
            <Link
              key={alliance.id}
              href={`/alliance/${alliance.region}/${alliance.albionId}`}
            >
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {alliance.tag
                        ? `[${alliance.tag}] ${alliance.name}`
                        : alliance.name}
                    </p>
                    <CachedSourceIcon label={tCommon("labels.cached")} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {regionLabel(alliance.region)} ·{" "}
                    {tCommon("labels.killFameWithUnit", {
                      value: formatFame(alliance.killFame),
                    })}
                    {alliance.memberCount != null
                      ? ` · ${tCommon("labels.membersCount", {
                          count: alliance.memberCount.toLocaleString(),
                        })}`
                      : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}

          {localResults.alliances.length === 0 && (
            <p className="text-muted-foreground">{t("noAlliances")}</p>
          )}
        </div>
      </PageSection>

      {!hasResults && !liveSearch.searching && liveSearch.lastError && (
        <p className="text-sm text-muted-foreground">
          {t("liveSearchFailed", { error: liveSearch.lastError })}
        </p>
      )}
    </div>
  );
}
