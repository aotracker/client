"use client";

import { memo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Swords } from "lucide-react";
import { AlbionKillboardIcon } from "@/components/AlbionKillboardIcon";
import { ContentBadge } from "@/components/ContentBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ItemPowerValue } from "@/components/StatValue";
import { cn, formatFame, formatItemName, formatItemPower, formatSilver, regionLabel } from "@/lib/utils";
import { parseItemType } from "@/lib/item-icons";
import { guildPath, playerPath } from "@/lib/seo";
import { leaderboardKillCardHighlightClassName } from "@/components/leaderboards/leaderboard-rank-styles";
import { ItemIcon } from "@/components/ItemIcon";
import { Tooltip } from "@/components/ui/tooltip";
import { RelativeTime } from "@/components/RelativeTime";
import {
  assistCountFromParticipants,
  combinedVictimEstSilver,
  KILL_CARD_PRIMARY_SLOTS,
  KILL_CARD_SECONDARY_SLOTS,
} from "@/lib/albion/player-history";

type KillCardItem = {
  ownerRole: string;
  slot: string | null;
  itemType: string;
  quality: number | null;
  category: string;
  displayNames?: Record<string, string>;
};

interface KillCardProps {
  event: {
    eventId: number;
    region: string;
    occurredAt: Date | string;
    contentType: string;
    totalVictimKillFame: number | null;
    participantCount?: number | null;
    lootEstSilver?: number | null;
    gearEstSilver?: number | null;
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

function itemDisplayName(item: { itemType: string; displayNames?: Record<string, string> }, locale: string) {
  const catalogName = item.displayNames?.[locale];
  if (!catalogName) return formatItemName(item.itemType);
  const { tier, enchantment } = parseItemType(item.itemType);
  return `${catalogName} (${tier}.${enchantment})`;
}

function itemsForRole(items: KillCardItem[] | undefined, role: "killer" | "victim") {
  return items?.filter((i) => i.ownerRole === role && i.category === "equipment") ?? [];
}

export const KillCard = memo(function KillCard({ event, compact = false, compactSize = "default", fameVariant, rank }: KillCardProps) {
  const locale = useLocale();
  const t = useTranslations("Kill");
  const tPlayer = useTranslations("Player.killCard");
  const tCommon = useTranslations("Common");
  const killHref = `/kill/${event.region}/${event.eventId}`;
  const large = compact && compactSize === "large";

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
  const unknown = tCommon("labels.unknown");
  const assistCount = assistCountFromParticipants(event.participantCount);

  return (
    <Card className={cn("transition-colors", borderClass)}>
      <div
        className={cn(
          "flex flex-col",
          large ? "gap-3 p-3 sm:p-4" : compact ? "gap-2 p-3" : "gap-3 p-4"
        )}
      >
        <KillValueStrip
          killHref={killHref}
          fame={event.totalVictimKillFame}
          gearEstSilver={event.gearEstSilver}
          lootEstSilver={event.lootEstSilver}
          lootCount={lootCount}
          assistCount={assistCount}
          contentType={event.contentType}
          region={event.region}
          occurredAt={event.occurredAt}
          fameVariant={fameVariant}
          large={large}
          killDetailsLabel={tPlayer("killDetails")}
          fameLabel={tCommon("labels.killFameWithUnit", {
            value: formatFame(event.totalVictimKillFame),
          })}
          lootLabel={t("lootItems", { count: lootCount })}
          assistLabel={t("assistItems", { count: assistCount ?? 0 })}
          killLabel={tPlayer("kill")}
          deathLabel={tPlayer("death")}
          estVictimValueLabel={tCommon("labels.estVictimValue")}
          estGearLabel={tCommon("labels.estGearValue", {
            value: formatSilver(event.gearEstSilver),
          })}
          estLootLabel={tCommon("labels.estLootValue", {
            value: formatSilver(event.lootEstSilver),
          })}
        />

        <div
          className={cn(
            "flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start",
            large
              ? "sm:gap-2 lg:gap-3"
              : compact
                ? "sm:items-center sm:gap-1.5"
                : "sm:items-center sm:gap-2"
          )}
        >
          <PlayerBlock
            compact={compact}
            compactSize={compactSize}
            name={event.killer?.name ?? unknown}
            guild={event.killer?.guild}
            allianceTag={event.killer?.allianceTag}
            region={event.region}
            albionId={event.killer?.albionId}
            weapon={killerMainHand}
            equipment={killerEquipment}
            itemPower={killerIp}
            locale={locale}
          />
          {compact ? (
            <span
              className={cn(
                "shrink-0 px-0.5 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-1 sm:pt-2 sm:text-xs",
                large && "lg:pt-2.5 lg:text-sm"
              )}
            >
              {t("killed")}
            </span>
          ) : (
            <div className="flex shrink-0 flex-col items-center px-2 sm:pt-1">
              <Swords className="mb-1 h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("killed")}
              </span>
            </div>
          )}
          <PlayerBlock
            compact={compact}
            compactSize={compactSize}
            name={event.victim?.name ?? unknown}
            guild={event.victim?.guild}
            allianceTag={event.victim?.allianceTag}
            region={event.region}
            albionId={event.victim?.albionId}
            weapon={victimMainHand}
            equipment={victimEquipment}
            itemPower={victimIp}
            isVictim
            locale={locale}
          />
        </div>
      </div>
    </Card>
  );
});

function KillValueStrip({
  killHref,
  fame,
  gearEstSilver,
  lootEstSilver,
  lootCount,
  assistCount,
  contentType,
  region,
  occurredAt,
  fameVariant,
  large,
  killDetailsLabel,
  fameLabel,
  lootLabel,
  assistLabel,
  killLabel,
  deathLabel,
  estVictimValueLabel,
  estGearLabel,
  estLootLabel,
}: {
  killHref: string;
  fame: number | null;
  gearEstSilver?: number | null;
  lootEstSilver?: number | null;
  lootCount: number;
  assistCount: number | null;
  contentType: string;
  region: string;
  occurredAt: Date | string;
  fameVariant?: "kill" | "death";
  large: boolean;
  killDetailsLabel: string;
  fameLabel: string;
  lootLabel: string;
  assistLabel: string;
  killLabel: string;
  deathLabel: string;
  estVictimValueLabel: string;
  estGearLabel: string;
  estLootLabel: string;
}) {
  const combined = combinedVictimEstSilver(gearEstSilver, lootEstSilver);
  const gear = gearEstSilver != null && gearEstSilver > 0 ? gearEstSilver : 0;
  const loot = lootEstSilver != null && lootEstSilver > 0 ? lootEstSilver : 0;
  const breakdown = [
    gear > 0 ? estGearLabel : null,
    loot > 0 ? estLootLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const silverTooltip = breakdown
    ? `${estVictimValueLabel}\n${breakdown}`
    : estVictimValueLabel;
  const statClass = cn(
    "inline-flex items-center gap-1 font-bold tabular-nums",
    large ? "text-base lg:text-lg" : "text-sm"
  );
  const showFightMeta = assistCount != null || lootCount > 0;

  return (
    <div className="flex flex-col gap-2 border-b border-border/40 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {fameVariant ? (
          <Badge
            size="sm"
            className={
              fameVariant === "kill"
                ? "border-stat-kill/40 bg-stat-kill/15 text-stat-kill"
                : "border-stat-death/40 bg-stat-death/15 text-stat-death"
            }
          >
            {fameVariant === "kill" ? killLabel : deathLabel}
          </Badge>
        ) : null}
        <Tooltip content={killDetailsLabel}>
          <Link
            href={killHref}
            aria-label={fameLabel}
            className={cn(statClass, "text-stat-fame hover:underline")}
          >
            <AlbionKillboardIcon icon="fame" className="size-3.5" />
            <span>{formatFame(fame)}</span>
          </Link>
        </Tooltip>
        {combined != null ? (
          <Tooltip content={silverTooltip}>
            <span className={cn(statClass, "text-foreground")} aria-label={estVictimValueLabel}>
              <AlbionKillboardIcon icon="silver" className="size-3.5" />
              <span>{formatSilver(combined)}</span>
            </span>
          </Tooltip>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 sm:items-end">
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <ContentBadge type={contentType} />
          {showFightMeta ? (
            <span className="text-xs text-muted-foreground">
              {assistCount != null ? <span>{assistLabel}</span> : null}
              {assistCount != null && lootCount > 0 ? " · " : null}
              {lootCount > 0 ? <span className="text-group">{lootLabel}</span> : null}
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            "text-xs text-muted-foreground",
            large && "lg:text-sm"
          )}
        >
          {regionLabel(region)} · <RelativeTime date={occurredAt} />
        </span>
      </div>
    </div>
  );
}

function BuildStrip({
  equipment,
  locale,
}: {
  equipment: KillCardItem[];
  locale: string;
}) {
  const tCommon = useTranslations("Common");
  const bySlot = new Map(
    equipment
      .filter((item) => item.slot != null)
      .map((item) => [item.slot as string, item])
  );

  if (bySlot.size === 0) return null;

  const slotLabel = (slot: string): string => {
    switch (slot) {
      case "MainHand":
        return tCommon("labels.mainHand");
      case "OffHand":
        return tCommon("labels.offHand");
      default:
        return slot;
    }
  };

  const renderSlot = (slot: string) => {
    const item = bySlot.get(slot);
    const label = slotLabel(slot);

    if (!item) {
      return (
        <Tooltip
          key={slot}
          content={`${label}: empty`}
          block
          className="size-12 rounded-md bg-muted/45 sm:size-12 lg:size-14 xl:size-16"
        >
          <span aria-label={`${label} empty`} className="block size-full" />
        </Tooltip>
      );
    }

    const name = itemDisplayName(item, locale);

    return (
      <div
        key={slot}
        className="relative size-12 leading-none sm:size-12 lg:size-14 xl:size-16"
      >
        <ItemIcon
          itemType={item.itemType}
          quality={item.quality}
          tooltip={name}
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
  locale,
}: {
  name: string;
  guild?: { name: string; albionId?: string } | null;
  allianceTag?: string | null;
  region: string;
  albionId?: string;
  weapon?: { itemType: string; quality: number | null; displayNames?: Record<string, string> } | null;
  equipment?: KillCardItem[];
  itemPower?: string | null;
  isVictim?: boolean;
  compact?: boolean;
  compactSize?: "default" | "large";
  locale: string;
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
          <span className="text-xs font-medium leading-none text-stat-ip">
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
          <BuildStrip equipment={equipment ?? []} locale={locale} />
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
              tooltip={itemDisplayName(weapon, locale)}
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
            tooltip={itemDisplayName(weapon, locale)}
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
