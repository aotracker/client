import Link from "next/link";
import { Swords } from "lucide-react";
import { ContentBadge } from "@/components/ContentBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ItemPowerValue } from "@/components/StatValue";
import { cn, formatFame, formatItemName, formatItemPower, regionLabel } from "@/lib/utils";
import { guildPath, playerPath } from "@/lib/seo";
import { leaderboardKillCardHighlightClassName } from "@/components/leaderboards/leaderboard-rank-styles";
import { ItemIcon } from "@/components/ItemIcon";
import { RelativeTime } from "@/components/RelativeTime";
import {
  KILL_CARD_PRIMARY_SLOTS,
  KILL_CARD_SECONDARY_SLOTS,
} from "@/lib/albion/player-history";
import { getCatalogItemName } from "@/lib/items/catalog";

type KillCardItem = {
  ownerRole: string;
  slot: string | null;
  itemType: string;
  quality: number | null;
  category: string;
};

interface KillCardProps {
  event: {
    eventId: number;
    region: string;
    occurredAt: Date | string;
    contentType: string;
    totalVictimKillFame: number | null;
    killer?: {
      albionId: string;
      name: string;
      guild?: { name: string; albionId?: string } | null;
      allianceTag?: string | null;
    } | null;
    victim?: {
      albionId: string;
      name: string;
      guild?: { name: string; albionId?: string } | null;
      allianceTag?: string | null;
    } | null;
    items?: KillCardItem[];
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

function slotLabel(slot: string): string {
  switch (slot) {
    case "MainHand":
      return "Main hand";
    case "OffHand":
      return "Off hand";
    default:
      return slot;
  }
}

function itemsForRole(items: KillCardItem[] | undefined, role: "killer" | "victim") {
  return items?.filter((i) => i.ownerRole === role && i.category === "equipment") ?? [];
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

  const killerEquipment = itemsForRole(event.items, "killer");
  const victimEquipment = itemsForRole(event.items, "victim");
  const killerMainHand = killerEquipment.find((i) => i.slot === "MainHand");
  const victimMainHand = victimEquipment.find((i) => i.slot === "MainHand");
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
              {fameVariant ? (
                <Badge
                  size="sm"
                  className={
                    fameVariant === "kill"
                      ? "border-stat-kill/40 bg-stat-kill/15 text-stat-kill"
                      : "border-stat-death/40 bg-stat-death/15 text-stat-death"
                  }
                >
                  {fameVariant === "kill" ? "Kill" : "Death"}
                </Badge>
              ) : null}
              <ContentBadge type={event.contentType} />
              <Link
                href={killHref}
                title="Kill Details"
                className={cn(
                  "truncate font-bold text-stat-fame hover:underline",
                  large ? "text-base lg:text-lg" : "text-sm"
                )}
              >
                {formatFame(event.totalVictimKillFame)} fame
              </Link>
            </div>
            <span className={cn(
              "text-xs text-muted-foreground sm:shrink-0 sm:text-right",
              large && "lg:text-sm"
            )}>
              {regionLabel(event.region)} · <RelativeTime date={event.occurredAt} />
            </span>
          </div>

          <div
            className={cn(
              "flex flex-col gap-2 border-t border-border/40 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start",
              large ? "pt-3 sm:gap-2 lg:gap-3" : "pt-2 sm:items-center sm:gap-1.5"
            )}
          >
            <PlayerBlock
              compact
              compactSize={compactSize}
              name={event.killer?.name ?? "Unknown"}
              guild={event.killer?.guild}
              allianceTag={event.killer?.allianceTag}
              region={event.region}
              albionId={event.killer?.albionId}
              weapon={killerMainHand}
              equipment={killerEquipment}
              itemPower={killerIp}
            />
            <span
              className={cn(
                "shrink-0 px-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:px-1 sm:pt-2 sm:text-xs",
                large && "lg:pt-2.5 lg:text-sm"
              )}
            >
              killed
            </span>
            <PlayerBlock
              compact
              compactSize={compactSize}
              name={event.victim?.name ?? "Unknown"}
              guild={event.victim?.guild}
              allianceTag={event.victim?.allianceTag}
              region={event.region}
              albionId={event.victim?.albionId}
              weapon={victimMainHand}
              equipment={victimEquipment}
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
            allianceTag={event.killer?.allianceTag}
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
            allianceTag={event.victim?.allianceTag}
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

function BuildStrip({
  equipment,
}: {
  equipment: KillCardItem[];
}) {
  const bySlot = new Map(
    equipment
      .filter((item) => item.slot != null)
      .map((item) => [item.slot as string, item])
  );

  if (bySlot.size === 0) return null;

  const renderSlot = (slot: string) => {
    const item = bySlot.get(slot);
    const label = slotLabel(slot);

    if (!item) {
      return (
        <div
          key={slot}
          className="size-12 rounded-md bg-muted/45 sm:size-12 lg:size-14 xl:size-16"
          title={`${label}: empty`}
          aria-label={`${label} empty`}
        />
      );
    }

    const name =
      getCatalogItemName(item.itemType) ?? formatItemName(item.itemType);

    return (
      <div
        key={slot}
        className="relative size-12 leading-none sm:size-12 lg:size-14 xl:size-16"
        title={`${label}: ${name}`}
      >
        <ItemIcon
          itemType={item.itemType}
          quality={item.quality}
          fill
          className="block object-contain"
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center">
        {KILL_CARD_PRIMARY_SLOTS.map(renderSlot)}
      </div>
      <div className="flex flex-wrap items-center">
        {KILL_CARD_SECONDARY_SLOTS.map(renderSlot)}
      </div>
    </div>
  );
}

function PlayerBlock({
  name,
  guild,
  allianceTag,
  region,
  albionId,
  weapon,
  equipment,
  itemPower,
  isVictim = false,
  compact = false,
  compactSize = "default",
}: {
  name: string;
  guild?: { name: string; albionId?: string } | null;
  allianceTag?: string | null;
  region: string;
  albionId?: string;
  weapon?: { itemType: string; quality: number | null } | null;
  equipment?: KillCardItem[];
  itemPower?: string | null;
  isVictim?: boolean;
  compact?: boolean;
  compactSize?: "default" | "large";
}) {
  const nameClassName = cn(
    "font-semibold hover:underline",
    isVictim ? "text-stat-death" : "text-stat-kill"
  );
  const tag = allianceTag?.trim() || null;

  const nameLine = (textClassName: string) => (
    <p className={cn("truncate leading-snug", textClassName)}>
      {tag ? (
        <span className="font-medium text-muted-foreground">[{tag}] </span>
      ) : null}
      {albionId ? (
        <Link href={playerPath(region, name)} className={nameClassName}>
          {name}
        </Link>
      ) : (
        <span className={nameClassName}>{name}</span>
      )}
      {itemPower ? (
        <>
          {" "}
          <span className="font-medium text-stat-ip">
            (<ItemPowerValue value={itemPower} className="font-medium" />)
          </span>
        </>
      ) : null}
    </p>
  );

  if (compact) {
    const large = compactSize === "large";

    if (large) {
      return (
        <div className="flex min-w-0 flex-col gap-2 lg:gap-2.5">
          <div className="min-w-0">
            {nameLine("text-sm lg:text-base")}
            {guild?.name ? (
              <p className="truncate text-xs leading-tight text-muted-foreground lg:text-sm lg:leading-snug">
                {guild.albionId ? (
                  <Link
                    href={guildPath(region, guild.name)}
                    className="hover:text-primary hover:underline"
                  >
                    {guild.name}
                  </Link>
                ) : (
                  guild.name
                )}
              </p>
            ) : null}
          </div>
          <BuildStrip equipment={equipment ?? []} />
        </div>
      );
    }

    const iconClass = "h-10 w-10 sm:h-14 sm:w-14";

    return (
      <div className="flex min-w-0 items-center gap-2">
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
          {nameLine("text-xs sm:text-sm")}
          {guild?.name ? (
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {guild.albionId ? (
                <Link
                  href={guildPath(region, guild.name)}
                  className="hover:text-primary hover:underline"
                >
                  {guild.name}
                </Link>
              ) : (
                guild.name
              )}
            </p>
          ) : null}
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
        {nameLine("text-sm")}
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
      </div>
    </div>
  );
}
