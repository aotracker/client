import Link from "next/link";
import { formatFame } from "@/lib/utils";
import type { GuildOpponentEntry } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GuildRivalsListProps {
  region: AlbionRegion;
  guildId: string;
  rivals: GuildOpponentEntry[];
}

export function GuildRivalsList({
  region,
  guildId,
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
        const opponentId = rival.guildAlbionId;
        const feudHref =
          opponentId && opponentId !== guildId
            ? `/feud/${region}/${guildId}/${opponentId}`
            : undefined;

        return (
          <li
            key={rival.guildName.toLowerCase()}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              {opponentId ? (
                <Link
                  href={`/guild/${region}/${opponentId}`}
                  className="truncate text-sm font-medium hover:text-primary hover:underline"
                >
                  {rival.guildName}
                </Link>
              ) : (
                <p className="truncate text-sm font-medium">{rival.guildName}</p>
              )}
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
  guildId,
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
          <GuildRivalsList region={region} guildId={guildId} rivals={rivals} />
        </CardContent>
      </Card>
    </section>
  );
}
