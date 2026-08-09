import Link from "next/link";
import { formatFame } from "@/lib/utils";
import type { GuildOpponentEntry } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { feudPath, guildPath } from "@/lib/seo";

interface GuildRivalsListProps {
  region: AlbionRegion;
  guildName: string;
  rivals: GuildOpponentEntry[];
}

export function GuildRivalsList({
  region,
  guildName,
  rivals,
}: GuildRivalsListProps) {
  if (rivals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tracked rival guilds in the last 30 days
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border/60 overflow-hidden rounded-md border border-border/60 bg-card/40">
      {rivals.map((rival) => {
        const feudHref =
          rival.guildName.toLowerCase() !== guildName.toLowerCase()
            ? feudPath(region, guildName, rival.guildName)
            : undefined;

        return (
          <li
            key={rival.guildName.toLowerCase()}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={guildPath(region, rival.guildName)}
                className="truncate text-sm font-medium hover:text-primary hover:underline"
              >
                {rival.guildName}
              </Link>
              <p className="text-xs text-muted-foreground">
                {rival.killsAgainst} kills · {formatFame(rival.fameAgainst)} fame
                {rival.deathsTo > 0
                  ? ` · ${rival.deathsTo} deaths · ${formatFame(rival.fameLost)} lost`
                  : ""}
              </p>
            </div>
            {feudHref && (
              <Link
                href={feudHref}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                View feud
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function GuildRivalsSection({
  region,
  guildId: _guildId,
  guildName,
  rivals,
}: {
  region: AlbionRegion;
  guildId: string;
  guildName: string;
  rivals: GuildOpponentEntry[];
}) {
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guild Rivals</CardTitle>
          <p className="text-sm text-muted-foreground">
            Most active opponents for {guildName} in the last 30 days
          </p>
        </CardHeader>
        <CardContent>
          <GuildRivalsList
            region={region}
            guildName={guildName}
            rivals={rivals}
          />
        </CardContent>
      </Card>
    </section>
  );
}
