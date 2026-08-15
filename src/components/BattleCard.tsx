import { memo } from "react";
import { Link } from "@/i18n/navigation";
import { Check, Swords } from "lucide-react";
import type { AlbionBattleSummary, AlbionRegion, GuildBattleSummary } from "@/lib/albion/types";
import type { BattlesFeedParticipant } from "@/lib/db/queries";
import { BattleParticipantPreview } from "@/components/BattleParticipantPreview";
import { StatValue } from "@/components/StatValue";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatFame, regionLabel } from "@/lib/utils";
import { RelativeTime } from "@/components/RelativeTime";

interface BattleCardProps {
  battle: AlbionBattleSummary | GuildBattleSummary;
  region?: AlbionRegion;
  showGuildStats?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  selectDisabled?: boolean;
  alliances?: BattlesFeedParticipant[];
  guilds?: BattlesFeedParticipant[];
  allianceCount?: number;
  guildCount?: number;
}

function isGuildBattle(
  battle: AlbionBattleSummary | GuildBattleSummary
): battle is GuildBattleSummary {
  return "guildMembers" in battle;
}

export const BattleCard = memo(function BattleCard({
  battle,
  region,
  showGuildStats = false,
  selectable = false,
  selected = false,
  onSelectChange,
  selectDisabled = false,
  alliances = [],
  guilds = [],
  allianceCount: _allianceCount = 0,
  guildCount: _guildCount = 0,
}: BattleCardProps) {
  const startTime = battle.startTime ? new Date(battle.startTime) : null;
  const guildBattle = isGuildBattle(battle) ? battle : null;
  const displayGuildStats = showGuildStats && guildBattle != null;
  const cardGuilds =
    guilds.length > 0
      ? guilds
      : guildBattle?.guilds ?? [];
  const hasParticipants = alliances.length > 0 || cardGuilds.length > 0;
  const battleHref = region ? `/battle/${region}/${battle.id}` : null;

  const stats = displayGuildStats ? (
    <>
      <StatValue
        label="Fame"
        value={formatFame(guildBattle.guildKillFame)}
        variant="fame"
      />
      <StatValue
        label="Members"
        value={guildBattle.guildMembers.toLocaleString()}
        variant="neutral"
      />
      <StatValue
        label="Kills"
        value={guildBattle.guildKills?.toLocaleString() ?? "—"}
        variant="kill"
      />
    </>
  ) : (
    <>
      <StatValue label="Total Fame" value={formatFame(battle.totalFame)} variant="fame" />
      <StatValue
        label="Total Kills"
        value={battle.totalKills?.toLocaleString() ?? "—"}
        variant="kill"
      />
      <StatValue
        label="Total Players"
        value={battle.totalPlayers?.toLocaleString() ?? "—"}
        variant="neutral"
      />
    </>
  );

  const meta = (
    <p className="break-words text-xs text-muted-foreground">
      {region && (
        <>
          {regionLabel(region)}
          <span className="text-muted-foreground/50"> · </span>
        </>
      )}
      {startTime && <RelativeTime date={startTime} />}
      {startTime && <span className="text-muted-foreground/50"> · </span>}
      Albion Battle #{battle.id}
    </p>
  );

  const identity = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/20">
        <Swords className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {hasParticipants ? (
          <>
            {alliances.length > 0 && (
              <BattleParticipantPreview
                label="Alliances"
                items={alliances}
                className="text-base font-semibold leading-snug text-foreground"
              />
            )}
            {cardGuilds.length > 0 && (
              <BattleParticipantPreview
                label="Guilds"
                items={cardGuilds}
                className={cn(
                  "leading-snug",
                  alliances.length > 0
                    ? "text-sm font-medium text-foreground/90"
                    : "text-base font-semibold text-foreground"
                )}
              />
            )}
            {meta}
          </>
        ) : (
          <>
            <p className="font-medium">Albion Battle #{battle.id}</p>
            {(region || startTime) && (
              <p className="break-words text-xs text-muted-foreground">
                {region && regionLabel(region)}
                {region && startTime && (
                  <span className="text-muted-foreground/50"> · </span>
                )}
                {startTime && <RelativeTime date={startTime} />}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );

  const body = (
    <div className="flex w-full min-w-0 flex-col gap-3 overflow-hidden sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">{identity}</div>
      <div className="grid w-full max-w-[18rem] grid-cols-3 gap-2 border-t border-border/40 pt-3 text-center sm:w-auto sm:max-w-none sm:shrink-0 sm:gap-5 sm:border-0 sm:pt-0 sm:text-right">
        {stats}
      </div>
    </div>
  );

  return (
    <Card
      className={cn(
        "w-full min-w-0 overflow-hidden transition-colors hover:border-primary/40",
        selected && "border-primary/60 bg-primary/5",
        battleHref && "hover:bg-muted/20"
      )}
    >
      <CardContent className="flex w-full min-w-0 items-start gap-3 overflow-hidden py-4">
        {selectable && (
          <label
            className={cn(
              "relative mt-1.5 inline-flex shrink-0 cursor-pointer",
              selectDisabled && !selected && "cursor-not-allowed opacity-50"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={selectDisabled && !selected}
              onChange={(e) => onSelectChange?.(e.target.checked)}
              aria-label={`Select battle ${battle.id}`}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                "border-border/70 bg-muted/40 text-primary-foreground shadow-sm",
                "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                "peer-checked:border-primary peer-checked:bg-primary peer-checked:[&>svg]:opacity-100",
                "peer-disabled:cursor-not-allowed"
              )}
            >
              <Check className="h-3.5 w-3.5 opacity-0 transition-opacity" strokeWidth={3} />
            </span>
          </label>
        )}
        {battleHref ? (
          <Link href={battleHref} className="block w-full min-w-0 flex-1 overflow-hidden">
            {body}
          </Link>
        ) : (
          <div className="w-full min-w-0 flex-1 overflow-hidden">{body}</div>
        )}
      </CardContent>
    </Card>
  );
});
