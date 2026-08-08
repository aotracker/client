"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Swords } from "lucide-react";
import type { AlbionBattlePlayer, AlbionRegion } from "@/lib/albion/types";
import { ItemIcon } from "@/components/ItemIcon";
import { StatValue } from "@/components/StatValue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatFame, formatItemPower } from "@/lib/utils";

import {
  BATTLE_LIST_PAGE_SIZE,
  BattleListPagination,
} from "@/components/BattleListPagination";

type PlayerSortKey = "fame" | "kills" | "deaths";

const PLAYER_SORT_OPTIONS: { value: PlayerSortKey; label: string }[] = [
  { value: "fame", label: "Fame" },
  { value: "kills", label: "Kills" },
  { value: "deaths", label: "Deaths" },
];

interface BattlePlayersListProps {
  region: AlbionRegion;
  players: AlbionBattlePlayer[];
}

function sortValue(player: AlbionBattlePlayer, sortBy: PlayerSortKey): number {
  if (sortBy === "kills") return player.kills;
  if (sortBy === "deaths") return player.deaths;
  return player.killFame;
}

export function BattlePlayersList({ region, players }: BattlePlayersListProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<PlayerSortKey>("fame");
  const [page, setPage] = useState(1);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = !query
      ? players
      : players.filter(
          (player) =>
            player.name.toLowerCase().includes(query) ||
            player.guildName?.toLowerCase().includes(query) ||
            player.allianceName?.toLowerCase().includes(query)
        );

    return [...matched].sort((a, b) => {
      const diff = sortValue(b, sortBy) - sortValue(a, sortBy);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [players, search, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / BATTLE_LIST_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * BATTLE_LIST_PAGE_SIZE;
  const pagedPlayers = filteredPlayers.slice(pageStart, pageStart + BATTLE_LIST_PAGE_SIZE);

  return (
    <section>
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-semibold">
              Players ({players.length})
            </CardTitle>
            <div className="relative w-full sm:w-44">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search players…"
                aria-label="Search players"
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by</span>
            {PLAYER_SORT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={sortBy === option.value ? "default" : "outline"}
                size="sm"
                aria-pressed={sortBy === option.value}
                onClick={() => setSortBy(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {players.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No player data for this battle
            </p>
          ) : filteredPlayers.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No players match &ldquo;{search.trim()}&rdquo;
            </p>
          ) : (
            pagedPlayers.map((player) => (
              <BattlePlayerCard key={player.id} region={region} player={player} />
            ))
          )}
        </CardContent>
      </Card>

      {filteredPlayers.length > BATTLE_LIST_PAGE_SIZE && (
        <BattleListPagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filteredPlayers.length}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}

function BattlePlayerCard({
  region,
  player,
}: {
  region: AlbionRegion;
  player: AlbionBattlePlayer;
}) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {player.weaponType ? (
            <div className="relative h-10 w-10 shrink-0">
              <ItemIcon
                itemType={player.weaponType}
                quality={player.weaponQuality ?? 1}
                alt="weapon"
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/20">
              <Swords className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/player/${region}/${player.id}`}
                className="truncate font-medium hover:text-primary hover:underline"
              >
                {player.name}
              </Link>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {player.guildName && player.guildId ? (
                <Link
                  href={`/guild/${region}/${player.guildId}`}
                  className="hover:text-primary hover:underline"
                >
                  {player.guildName}
                </Link>
              ) : (
                <span>No guild</span>
              )}
              {player.allianceName && player.allianceId && (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href={`/alliance/${region}/${player.allianceId}`}
                    className="hover:text-primary hover:underline"
                  >
                    {player.allianceName}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-right text-sm">
          <StatValue
            label="IP"
            value={formatItemPower(player.averageIp) ?? "—"}
            variant="ip"
          />
          <StatValue label="Fame" value={formatFame(player.killFame)} variant="fame" />
          <StatValue label="Kills" value={player.kills.toLocaleString()} variant="kill" />
          <StatValue label="Deaths" value={player.deaths.toLocaleString()} variant="death" />
        </div>
      </CardContent>
    </Card>
  );
}
