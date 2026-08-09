import Link from "next/link";
import type { Metadata } from "next";
import { searchLocal } from "@/lib/db/queries";
import {
  ensureLiveSearchQueued,
  getLiveSearchJobInfo,
} from "@/lib/ingest-api";
import {
  ENABLED_REGIONS,
  getDefaultRegion,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";
import {
  isLiveSearchInProgress,
  resolveLiveSearchRegions,
} from "@/lib/search/live-search";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/PageSection";
import { SearchForm } from "@/components/SearchForm";
import { SearchLivePoller } from "@/components/SearchLivePoller";
import { formatFame, regionLabel } from "@/lib/utils";
import { buildPageMetadata, guildPath, NOINDEX_FOLLOW, playerPath } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Search",
  description: "Search Albion Online players and guilds across all regions.",
  canonicalPath: "/search",
  robots: NOINDEX_FOLLOW,
});

interface PageProps {
  searchParams: Promise<{ q?: string; region?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const requestedRegion = params.region ?? getDefaultRegion();
  const preferredRegion: AlbionRegion = isRegionEnabled(requestedRegion)
    ? requestedRegion
    : getDefaultRegion();
  const liveRegions = resolveLiveSearchRegions(null);

  if (!query) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Search"
          description="Find Albion Online players and guilds by name."
        />
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
      error instanceof Error ? error.message : "Search temporarily unavailable";
  }

  const hasResults =
    localResults.players.length > 0 ||
    localResults.guilds.length > 0 ||
    localResults.alliances.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search Results"
        description={`Results for “${query}”`}
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
        <div className="alert-warning rounded-md p-3 text-sm">
          {searchError}
        </div>
      )}

      {ENABLED_REGIONS.length === 0 && (
        <p className="text-sm text-muted-foreground">No regions enabled.</p>
      )}

      <PageSection title="Players">
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
                    <Badge variant="outline">Cached</Badge>
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
                  <p>{formatFame(player.killFame)} kill fame</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {localResults.players.length === 0 && !liveSearch.searching && (
            <p className="text-muted-foreground">No players found.</p>
          )}
          {localResults.players.length === 0 && liveSearch.searching && (
            <p className="text-muted-foreground">
              No cached players yet — checking Albion Online…
            </p>
          )}
        </div>
      </PageSection>

      <PageSection title="Guilds">
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
                    <Badge variant="outline">Cached</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {regionLabel(guild.region)} · {formatFame(guild.killFame)}{" "}
                    kill fame
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}

          {localResults.guilds.length === 0 && !liveSearch.searching && (
            <p className="text-muted-foreground">No guilds found.</p>
          )}
          {localResults.guilds.length === 0 && liveSearch.searching && (
            <p className="text-muted-foreground">
              No cached guilds yet — checking Albion Online…
            </p>
          )}
        </div>
      </PageSection>

      <PageSection title="Alliances">
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
                    <Badge variant="outline">Cached</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {regionLabel(alliance.region)}
                    {alliance.memberCount != null
                      ? ` · ${alliance.memberCount.toLocaleString()} members`
                      : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}

          {localResults.alliances.length === 0 && (
            <p className="text-muted-foreground">
              No alliances found. Alliance search is local-only.
            </p>
          )}
        </div>
      </PageSection>

      {!hasResults && !liveSearch.searching && liveSearch.lastError && (
        <p className="text-sm text-muted-foreground">
          Live search failed: {liveSearch.lastError}
        </p>
      )}
    </div>
  );
}
