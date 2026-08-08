import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { searchLocal } from "@/lib/db/queries";
import {
  ENABLED_REGIONS,
  getDefaultRegion,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/PageSection";
import { SearchForm } from "@/components/SearchForm";
import {
  SearchLiveFallback,
  SearchLiveResults,
} from "@/components/search/SearchLiveResults";
import { formatFame, regionLabel } from "@/lib/utils";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";

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

  try {
    localResults = await searchLocal(query);
  } catch {
    // keep empty defaults
  }

  const seenPlayerIds = new Set(
    localResults.players.map((p) => `${p.region}-${p.albionId}`)
  );
  const seenGuildIds = new Set(
    localResults.guilds.map((g) => `${g.region}-${g.albionId}`)
  );

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
                      href={`/player/${player.region}/${player.albionId}`}
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
                            href={`/guild/${player.region}/${player.guild.albionId}`}
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

          {localResults.players.length === 0 && (
            <p className="text-muted-foreground">No cached players found.</p>
          )}
        </div>
      </PageSection>

      <PageSection title="Guilds">
        <div className="space-y-2">
          {localResults.guilds.map((guild) => (
            <Link
              key={guild.id}
              href={`/guild/${guild.region}/${guild.albionId}`}
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

          {localResults.guilds.length === 0 && (
            <p className="text-muted-foreground">No cached guilds found.</p>
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
              No cached alliances found. Alliance search is local-only.
            </p>
          )}
        </div>
      </PageSection>

      {isRegionEnabled(preferredRegion) && (
        <Suspense fallback={<SearchLiveFallback />}>
          <SearchLiveResults
            query={query}
            region={preferredRegion}
            seenPlayerIds={seenPlayerIds}
            seenGuildIds={seenGuildIds}
          />
        </Suspense>
      )}
    </div>
  );
}
