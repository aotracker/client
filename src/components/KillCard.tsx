import Link from "next/link";
import { Swords } from "lucide-react";
import { ContentBadge } from "@/components/ContentBadge";
import { Card } from "@/components/ui/card";
import { ItemPowerValue } from "@/components/StatValue";
import { cn, formatFame, formatItemPower, regionLabel } from "@/lib/utils";
import { guildPath, playerPath } from "@/lib/seo";
import { leaderboardKillCardHighlightClassName } from "@/components/leaderboards/leaderboard-rank-styles";
import { ItemIcon } from "@/components/ItemIcon";
import { RelativeTime } from "@/components/RelativeTime";
interface KillCardProps {
  event: {
    eventId: number;
    region: string;
    occurredAt: Date;
    contentType: string;
    totalVictimKillFame: number | null;
    killer?: {
      albionId: string;
      name: string;
      guild?: { name: string; albionId?: string } | null;
    } | null;
    victim?: {
      albionId: string;
      name: string;
      guild?: { name: string; albionId?: string } | null;
    } | null;
    items?: {
      ownerRole: string;
      slot: string | null;
      itemType: string;
      quality: number | null;
      category: string;
    }[];
    participants?: {
      role: string;
      averageItemPower: string | null;
    }[];
  };
  /** Stacked layout for narrow containers (e.g. homepage sidebar column). */
  compact?: boolean;
  /** Slightly larger compact layout for player profile kill/death lists. */
  compactSize?: "default" | "large";
  /** Border color for player profile kill/death lists. */
  fameVariant?: "kill" | "death";
  /** Leaderboard rank for top-3 highlight styling. */
  rank?: number;
}

export function KillCard({ event, compact = false, compactSize = "default", fameVariant, rank }: KillCardProps) {
  const killHref = `/kill/${event.region}/${event.eventId}`;

  const borderClass =
    rank != null && rank <= 3
      ? leaderboardKillCardHighlightClassName(rank)
      : fameVariant === "kill"
      ? "border-stat-kill/40 hover:border-stat-kill/60"
      : fameVariant === "death"
        ? "border-stat-death/40 hover:border-stat-death/60"
        : "hover:border-primary/40";

  const killerMainHand = event.items?.find(
    (i) => i.ownerRole === "killer" && i.slot === "MainHand"
  );
  const victimMainHand = event.items?.find(
    (i) => i.ownerRole === "victim" && i.slot === "MainHand"
  );
  const lootCount = event.items?.filter((i) => i.category === "inventory").length ?? 0;
  const killerIp = formatItemPower(
    event.participants?.find((p) => p.role === "killer")?.averageItemPower
  );
  const victimIp = formatItemPower(
    event.participants?.find((p) => p.role === "victim")?.averageItemPower
  );

  if (compact) {
    const large = compactSize === "large";

    return (
      <Card className={cn("transition-colors", borderClass)}>
        <div className={cn("flex flex-col", large ? "gap-3 p-3 sm:p-4" : "gap-2 p-3")}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <ContentBadge type={event.contentType} />
              <Link
                href={killHref}
                title="Kill Details"
                className={cn(
                  "truncate font-bold text-stat-fame hover:underline",
                  large ? "text-base" : "text-sm"
                )}
              >
                {formatFame(event.totalVictimKillFame)} fame
              </Link>
            </div>
            <span className="text-xs text-muted-foreground sm:shrink-0 sm:text-right">
              {regionLabel(event.region)} · <RelativeTime date={event.occurredAt} />
            </span>
          </div>

          <div
            className={cn(
              "flex flex-col gap-2 border-t border-border/40 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center",
              large ? "pt-3 sm:gap-2" : "pt-2 sm:gap-1.5"
            )}
          >
            <PlayerBlock
              compact
              compactSize={compactSize}
              name={event.killer?.name ?? "Unknown"}
              guild={event.killer?.guild}
              region={event.region}
              albionId={event.killer?.albionId}
              weapon={killerMainHand}
              itemPower={killerIp}
            />
            <span className="shrink-0 px-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:px-1 sm:text-xs">
              killed
            </span>
            <PlayerBlock
              compact
              compactSize={compactSize}
              name={event.victim?.name ?? "Unknown"}
              guild={event.victim?.guild}
              region={event.region}
              albionId={event.victim?.albionId}
              weapon={victimMainHand}
              itemPower={victimIp}
              isVictim
            />
          </div>

          {lootCount > 0 && (
            <p className={cn("text-group", "text-xs")}>
              {lootCount} loot items
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-colors", borderClass)}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <PlayerBlock
            name={event.killer?.name ?? "Unknown"}
            guild={event.killer?.guild}
            region={event.region}
            albionId={event.killer?.albionId}
            weapon={killerMainHand}
            itemPower={killerIp}
          />

          <Link
            href={killHref}
            title="Kill Details"
            className="flex shrink-0 flex-col items-center rounded-md px-3 py-2 text-center transition-colors hover:bg-accent/50"
          >
            <Swords className="mb-1 h-5 w-5 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              killed
            </span>
            <span className="text-sm font-bold text-stat-fame">
              {formatFame(event.totalVictimKillFame)}
            </span>
            <div className="mt-1.5">
              <ContentBadge type={event.contentType} />
            </div>
          </Link>

          <PlayerBlock
            name={event.victim?.name ?? "Unknown"}
            guild={event.victim?.guild}
            region={event.region}
            albionId={event.victim?.albionId}
            weapon={victimMainHand}
            itemPower={victimIp}
            isVictim
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <span className="text-xs text-muted-foreground">
            {regionLabel(event.region)} · <RelativeTime date={event.occurredAt} />
          </span>
          {lootCount > 0 && (
            <span className="text-xs text-group">{lootCount} loot items</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function PlayerBlock({
  name,
  guild,
  region,
  albionId,
  weapon,
  itemPower,
  isVictim = false,
  compact = false,
  compactSize = "default",
}: {
  name: string;
  guild?: { name: string; albionId?: string } | null;
  region: string;
  albionId?: string;
  weapon?: { itemType: string; quality: number | null } | null;
  itemPower?: string | null;
  isVictim?: boolean;
  compact?: boolean;
  compactSize?: "default" | "large";
}) {
  const nameClassName = cn(
    "block truncate text-sm font-semibold hover:underline",
    isVictim ? "text-stat-death" : "text-stat-kill"
  );

  if (compact) {
    const large = compactSize === "large";
    const iconClass = large
      ? "h-10 w-10 sm:h-16 sm:w-16"
      : "h-10 w-10 sm:h-14 sm:w-14";

    return (
      <div className={cn("flex min-w-0 items-center", large ? "gap-2 sm:gap-3" : "gap-2")}>
        {weapon && (
          <div className={cn("relative shrink-0", iconClass)}>
            <ItemIcon
              itemType={weapon.itemType}
              quality={weapon.quality ?? 1}
              alt="weapon"
              fill
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {albionId ? (
            <Link
              href={playerPath(region, name)}
              className={cn(
                nameClassName,
                large ? "text-sm leading-snug" : "text-xs leading-tight sm:text-sm"
              )}
            >
              {name}
            </Link>
          ) : (
            <p
              className={cn(
                nameClassName,
                large ? "text-sm leading-snug" : "text-xs leading-tight sm:text-sm"
              )}
            >
              {name}
            </p>
          )}
          {(guild?.name || itemPower) && (
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {guild?.name &&
                (guild.albionId ? (
                  <Link
                    href={guildPath(region, guild.name)}
                    className="hover:text-primary hover:underline"
                  >
                    {guild.name}
                  </Link>
                ) : (
                  guild.name
                ))}
              {guild?.name && itemPower ? " · " : null}
              {itemPower ? <ItemPowerValue value={itemPower} /> : null}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3 overflow-hidden">
      {weapon && (
        <div className="relative h-16 w-16 shrink-0">
          <ItemIcon
            itemType={weapon.itemType}
            quality={weapon.quality ?? 1}
            alt="weapon"
            fill
          />
        </div>
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        {albionId ? (
          <Link href={playerPath(region, name)} className={nameClassName}>
            {name}
          </Link>
        ) : (
          <p className={nameClassName}>{name}</p>
        )}
        {guild?.name &&
          (guild.albionId ? (
            <Link
              href={guildPath(region, guild.name)}
              className="block truncate text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              {guild.name}
            </Link>
          ) : (
            <p className="truncate text-xs text-muted-foreground">{guild.name}</p>
          ))}
        {itemPower && (
          <p className="text-xs">
            <ItemPowerValue value={itemPower} />
          </p>
        )}
      </div>
    </div>
  );
}
