import Link from "next/link";
import { getAlbionClient, PAGE_LOAD_REQUEST_OPTIONS } from "@/lib/albion/client";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/PageSection";
import { formatFame, regionLabel } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type LocalPlayer = {
  id: string;
  region: AlbionRegion;
  albionId: string;
  name: string;
  killFame: number;
  guild?: { albionId: string; name: string } | null;
};

type LocalGuild = {
  id: string;
  region: AlbionRegion;
  albionId: string;
  name: string;
  killFame: number;
};

interface SearchLiveResultsProps {
  query: string;
  region: AlbionRegion;
  seenPlayerIds: Set<string>;
  seenGuildIds: Set<string>;
}

export async function SearchLiveResults({
  query,
  region,
  seenPlayerIds,
  seenGuildIds,
}: SearchLiveResultsProps) {
  if (!isRegionEnabled(region)) return null;

  let livePlayers: {
    Id?: string;
    Name?: string;
    GuildId?: string;
    GuildName?: string;
    KillFame?: number;
    DeathFame?: number;
  }[] = [];
  let liveGuilds: {
    Id: string;
    Name: string;
    AllianceId?: string;
    AllianceName?: string;
    killFame?: number;
  }[] = [];
  let liveError: string | null = null;

  try {
    const client = getAlbionClient();
    const live = await client.search(region, query, PAGE_LOAD_REQUEST_OPTIONS);
    livePlayers = live.players ?? [];
    liveGuilds = live.guilds ?? [];
  } catch (e) {
    liveError = e instanceof Error ? e.message : "Live search failed";
  }

  const extraPlayers = livePlayers.filter(
    (p) => p.Id && !seenPlayerIds.has(`${region}-${p.Id}`)
  );
  const extraGuilds = liveGuilds.filter(
    (g) => !seenGuildIds.has(`${region}-${g.Id}`)
  );

  if (liveError && extraPlayers.length === 0 && extraGuilds.length === 0) {
    return (
      <div className="alert-warning rounded-md p-3 text-sm">
        Live API search unavailable: {liveError}. Showing local results only.
        Refresh page in a few minutes.
      </div>
    );
  }

  if (extraPlayers.length === 0 && extraGuilds.length === 0) {
    return null;
  }

  return (
    <>
      {liveError && (
        <div className="alert-warning rounded-md p-3 text-sm">
          Live API search unavailable: {liveError}. Showing local results only.
          Refresh page in a few minutes.
        </div>
      )}

      {extraPlayers.length > 0 && (
        <PageSection title="Players (live)">
          <div className="space-y-2">
            {extraPlayers.map((player) => (
              <Card
                key={player.Id}
                className="transition-colors hover:border-primary/40"
              >
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/player/${region}/${player.Id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {player.Name}
                      </Link>
                      <Badge variant="default">Live</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {regionLabel(region)}
                      {player.GuildName && (
                        <>
                          {" · "}
                          {player.GuildId ? (
                            <Link
                              href={`/guild/${region}/${player.GuildId}`}
                              className="hover:text-primary hover:underline"
                            >
                              {player.GuildName}
                            </Link>
                          ) : (
                            player.GuildName
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{formatFame(player.KillFame)} kill fame</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageSection>
      )}

      {extraGuilds.length > 0 && (
        <PageSection title="Guilds (live)">
          <div className="space-y-2">
            {extraGuilds.map((guild) => (
              <Link key={guild.Id} href={`/guild/${region}/${guild.Id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{guild.Name}</p>
                      <Badge variant="default">Live</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {regionLabel(region)} · {formatFame(guild.killFame)} kill
                      fame
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </PageSection>
      )}
    </>
  );
}

export function SearchLiveFallback() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Searching live API">
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-16 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export type { LocalPlayer, LocalGuild };
