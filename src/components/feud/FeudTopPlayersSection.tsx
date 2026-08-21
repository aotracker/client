import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageSection } from "@/components/PageSection";
import { FeudDisplayName } from "@/components/feud/FeudDisplayName";
import { StatValue, statHeaderClass } from "@/components/StatValue";
import { cn, formatFame } from "@/lib/utils";
import type { FeudTopPlayers } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { playerPath, guildPath } from "@/lib/seo";

interface FeudTopPlayersSectionProps {
  region: AlbionRegion;
  nameA: string;
  nameB: string;
  tagA?: string | null;
  tagB?: string | null;
  players: FeudTopPlayers;
}

function PlayerList({
  region,
  title,
  entries,
  emptyLabel,
  countVariant,
  countLabel,
  fameLabel,
}: {
  region: AlbionRegion;
  title: string;
  entries: FeudTopPlayers["aKillers"];
  emptyLabel: string;
  countVariant: "kill" | "death";
  countLabel: string;
  fameLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="px-3 py-3">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            statHeaderClass(countVariant)
          )}
        >
          {title}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <p
        className={cn(
          "border-b border-border/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide",
          statHeaderClass(countVariant)
        )}
      >
        {title}
      </p>
      <ol className="divide-y divide-border/40">
        {entries.map((entry) => (
          <li
            key={entry.playerId}
            className="flex items-center justify-between gap-3 px-3 py-2.5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-x-1.5">
              <Link
                href={playerPath(region, entry.name)}
                className="min-w-0 truncate text-sm font-medium hover:text-primary hover:underline"
              >
                {entry.name}
              </Link>
              {entry.guildName && (
                <>
                  <span className="text-muted-foreground/50" aria-hidden>
                    ·
                  </span>
                  {entry.guildAlbionId ? (
                    <Link
                      href={guildPath(region, entry.guildName)}
                      className="min-w-0 truncate text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      {entry.guildName}
                    </Link>
                  ) : (
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {entry.guildName}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-x-1.5">
              <StatValue
                value={`${entry.kills.toLocaleString()} ${countLabel}`}
                variant={countVariant}
                size="table"
              />
              <span className="text-muted-foreground/50" aria-hidden>
                ·
              </span>
              <StatValue
                value={`${formatFame(entry.fame)} ${fameLabel}`}
                variant="fame"
                size="table"
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SideColumn({
  region,
  sideName,
  sideTag,
  killers,
  victims,
  labels,
  killsLabel,
  deathsLabel,
  fameLabel,
}: {
  region: AlbionRegion;
  sideName: string;
  sideTag?: string | null;
  killers: FeudTopPlayers["aKillers"];
  victims: FeudTopPlayers["aVictims"];
  labels: {
    killers: string;
    victims: string;
    emptyKillers: string;
    emptyVictims: string;
  };
  killsLabel: string;
  deathsLabel: string;
  fameLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-muted/10">
      <div className="border-b border-border/60 bg-muted/25 px-3 py-2.5">
        <p className="truncate font-display text-sm font-semibold">
          <FeudDisplayName name={sideName} tag={sideTag} />
        </p>
      </div>
      <PlayerList
        region={region}
        title={labels.killers}
        entries={killers}
        emptyLabel={labels.emptyKillers}
        countVariant="kill"
        countLabel={killsLabel}
        fameLabel={fameLabel}
      />
      <PlayerList
        region={region}
        title={labels.victims}
        entries={victims}
        emptyLabel={labels.emptyVictims}
        countVariant="death"
        countLabel={deathsLabel}
        fameLabel={fameLabel}
      />
    </div>
  );
}

export async function FeudTopPlayersSection({
  region,
  nameA,
  nameB,
  tagA,
  tagB,
  players,
}: FeudTopPlayersSectionProps) {
  const t = await getTranslations("Feud.topPlayers");
  const tScoreboard = await getTranslations("Feud.scoreboard");
  const fameLabel = tScoreboard("fame");
  const killsLabel = t("kills");
  const deathsLabel = t("deaths");
  const hasPlayers =
    players.aKillers.length > 0 ||
    players.bKillers.length > 0 ||
    players.aVictims.length > 0 ||
    players.bVictims.length > 0;

  if (!hasPlayers) return null;

  const labels = {
    killers: t("killers"),
    victims: t("victims"),
    emptyKillers: t("emptyKillers"),
    emptyVictims: t("emptyVictims"),
  };

  return (
    <PageSection title={t("title")} description={t("description")}>
      <div className="grid gap-4 lg:grid-cols-2">
        <SideColumn
          region={region}
          sideName={nameA}
          sideTag={tagA}
          killers={players.aKillers}
          victims={players.aVictims}
          labels={labels}
          killsLabel={killsLabel}
          deathsLabel={deathsLabel}
          fameLabel={fameLabel}
        />
        <SideColumn
          region={region}
          sideName={nameB}
          sideTag={tagB}
          killers={players.bKillers}
          victims={players.bVictims}
          labels={labels}
          killsLabel={killsLabel}
          deathsLabel={deathsLabel}
          fameLabel={fameLabel}
        />
      </div>
    </PageSection>
  );
}
