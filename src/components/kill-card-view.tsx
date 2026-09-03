import { memo } from "react";
import { Link } from "@/i18n/navigation";
import { Swords } from "lucide-react";
import { AlbionKillboardIcon } from "@/components/AlbionKillboardIcon";
import { ContentBadge } from "@/components/ContentBadge";
import { OrangeZoneBadge } from "@/components/OrangeZoneBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ItemPowerValue } from "@/components/StatValue";
import { cn, formatFame, formatItemName, formatItemPower, formatSilver, regionLabel } from "@/lib/utils";
import { parseItemType } from "@/lib/item-icons";
import { guildPath, playerPath } from "@/lib/seo";
import { leaderboardKillCardHighlightClassName } from "@/components/leaderboards/leaderboard-rank-styles";
import { ItemIcon } from "@/components/ItemIcon";
import { TwitchIcon } from "@/components/media/TwitchIcon";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { RelativeTime } from "@/components/RelativeTime";
import {
  assistCountFromParticipants,
  combinedVictimEstSilver,
  KILL_CARD_PRIMARY_SLOTS,
  KILL_CARD_SECONDARY_SLOTS,
} from "@/lib/albion/player-history";
import { isJuicyHighValueKill } from "@/lib/kills-feed-params";
import type { KillCardCopy } from "@/components/kill-card-copy";

type KillCardItem = {
  ownerRole: string;
  slot: string | null;
  itemType: string;
  quality: number | null;
  category: string;
  displayNames?: Record<string, string>;
};

export interface KillCardEvent {
  eventId: number;
  region: string;
  occurredAt: Date | string;
  contentType: string;
  totalVictimKillFame: number | null;
  participantCount?: number | null;
  lootEstSilver?: number | null;
  gearEstSilver?: number | null;
  isOrangeZone?: boolean;
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
  twitchVodUrl?: string;
}

export interface KillCardViewProps {
  event: KillCardEvent;
  copy: KillCardCopy;
  locale: string;
  /** Stacked layout for narrow containers (e.g. homepage sidebar column). */
  compact?: boolean;
  /** Slightly larger compact layout for player profile kill/death lists. */
  compactSize?: "default" | "large";
  /** Home feed layout optimized for half-width columns. */
  home?: boolean;
  /** Border color for player profile kill/death lists. */
  fameVariant?: "kill" | "death";
  /** Leaderboard rank for top-3 highlight styling. */
  rank?: number;
  /** Live feed: linger highlight after a newly inserted kill. */
  fresh?: boolean;
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

export const KillCardView = memo(function KillCardView({
  event,
  copy,
  locale,
  compact = false,
  compactSize = "default",
  home = false,
  fameVariant,
  rank,
  fresh = false,
}: KillCardViewProps) {
  const killHref = `/kill/${event.region}/${event.eventId}`;
  const large = compact && compactSize === "large";
  const isHome = home;
  const highValue = isJuicyHighValueKill(event.gearEstSilver, event.lootEstSilver);

  const borderClass =
    rank != null && rank <= 3
      ? leaderboardKillCardHighlightClassName(rank)
      : fameVariant === "kill"
      ? "border-stat-kill/40 hover:border-stat-kill/60"
      : fameVariant === "death"
        ? "border-stat-death/40 hover:border-stat-death/60"
        : highValue
          ? "border-warning/40 bg-warning/10 hover:border-warning/60"
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
  const assistCount = assistCountFromParticipants(event.participantCount);

  return (
    <Card className={cn("transition-colors", borderClass, fresh && "feed-fresh")}>
      <div
        className={cn(
          "flex flex-col",
          large
            ? "gap-3 p-3 sm:p-4"
            : isHome
              ? "gap-1.5 p-3"
              : compact
                ? "gap-2 p-3"
                : "gap-3 p-4"
        )}
      >
        <KillValueStrip
          killHref={killHref}
          fame={event.totalVictimKillFame}
          gearEstSilver={event.gearEstSilver}
          lootEstSilver={event.lootEstSilver}
          lootCount={lootCount}
          assistCount={assistCount}
          highValue={highValue}
          highValueLabel={copy.highValue}
          highValueHint={copy.highValueHint}
          contentType={event.contentType}
          isOrangeZone={event.isOrangeZone === true}
          orangeZoneLabel={copy.orangeZone}
          orangeZoneHint={copy.orangeZoneHint}
          region={event.region}
          occurredAt={event.occurredAt}
          fameVariant={fameVariant}
          large={large}
          home={home}
          twitchVodUrl={event.twitchVodUrl}
          vodLabel={copy.vodLabel}
          killDetailsLabel={copy.killDetails}
          fameLabel={copy.fameLabel(formatFame(event.totalVictimKillFame))}
          lootLabel={copy.lootItems(lootCount)}
          assistLabel={copy.assistItems(assistCount ?? 0)}
          killLabel={copy.kill}
          deathLabel={copy.death}
          estVictimValueLabel={copy.estVictimValue}
          estGearLabel={copy.estGearValue(formatSilver(event.gearEstSilver))}
          estLootLabel={copy.estLootValue(formatSilver(event.lootEstSilver))}
        />

        {home ? (
          <HomeFightRow
            killer={{
              name: event.killer?.name ?? copy.unknown,
              guild: event.killer?.guild,
              allianceTag: event.killer?.allianceTag,
              albionId: event.killer?.albionId,
              itemPower: killerIp,
              weapon: killerMainHand,
            }}
            victim={{
              name: event.victim?.name ?? copy.unknown,
              guild: event.victim?.guild,
              allianceTag: event.victim?.allianceTag,
              albionId: event.victim?.albionId,
              itemPower: victimIp,
              weapon: victimMainHand,
            }}
            region={event.region}
            locale={locale}
            killedLabel={copy.killed}
          />
        ) : (
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
            name={event.killer?.name ?? copy.unknown}
            guild={event.killer?.guild}
            allianceTag={event.killer?.allianceTag}
            region={event.region}
            albionId={event.killer?.albionId}
            weapon={killerMainHand}
            equipment={killerEquipment}
            itemPower={killerIp}
            locale={locale}
            copy={copy}
          />
          {compact ? (
            <span
              className={cn(
                "shrink-0 px-0.5 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-1 sm:pt-2 sm:text-xs",
                large && "lg:pt-2.5 lg:text-sm"
              )}
            >
              {copy.killed}
            </span>
          ) : (
            <div className="flex shrink-0 flex-col items-center px-2 sm:pt-1">
              <Swords className="mb-1 h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {copy.killed}
              </span>
            </div>
          )}
          <PlayerBlock
            compact={compact}
            compactSize={compactSize}
            name={event.victim?.name ?? copy.unknown}
            guild={event.victim?.guild}
            allianceTag={event.victim?.allianceTag}
            region={event.region}
            albionId={event.victim?.albionId}
            weapon={victimMainHand}
            equipment={victimEquipment}
            itemPower={victimIp}
            isVictim
            locale={locale}
            copy={copy}
          />
        </div>
        )}
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
  highValue,
  highValueLabel,
  highValueHint,
  contentType,
  isOrangeZone,
  orangeZoneLabel,
  orangeZoneHint,
  region,
  occurredAt,
  fameVariant,
  large,
  home = false,
  twitchVodUrl,
  vodLabel,
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
  highValue: boolean;
  highValueLabel: string;
  highValueHint: string;
  contentType: string;
  isOrangeZone: boolean;
  orangeZoneLabel: string;
  orangeZoneHint: string;
  region: string;
  occurredAt: Date | string;
  fameVariant?: "kill" | "death";
  large: boolean;
  home?: boolean;
  twitchVodUrl?: string;
  vodLabel: string;
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
  const isHome = home;
  const statClass = cn(
    "inline-flex items-center gap-1.5 font-bold tabular-nums",
    large ? "text-base lg:text-lg" : isHome ? "text-xs" : "text-sm"
  );
  const statIconClass = large ? "size-5" : isHome ? "size-3.5" : "size-4";
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
            <AlbionKillboardIcon icon="fame" className={statIconClass} />
            <span>{formatFame(fame)}</span>
          </Link>
        </Tooltip>
        {combined != null ? (
          <Tooltip content={silverTooltip}>
            <span
              className={cn(
                statClass,
                highValue ? "text-warning" : "text-foreground"
              )}
              aria-label={estVictimValueLabel}
            >
              <AlbionKillboardIcon icon="silver" className={statIconClass} />
              <span>{formatSilver(combined)}</span>
            </span>
          </Tooltip>
        ) : null}
        {highValue ? (
          <Tooltip content={highValueHint}>
            <Badge
              size="sm"
              className="border-warning/40 bg-warning/15 text-warning"
            >
              {highValueLabel}
            </Badge>
          </Tooltip>
        ) : null}
        {twitchVodUrl ? (
          <Tooltip content={vodLabel}>
            <Button
              href={twitchVodUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              variant="ghost"
              className="px-2 text-twitch hover:bg-twitch/15 hover:text-twitch"
              aria-label={vodLabel}
            >
              <TwitchIcon className={statIconClass} />
            </Button>
          </Tooltip>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 sm:items-end">
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isOrangeZone ? (
            <OrangeZoneBadge
              label={orangeZoneLabel}
              hint={orangeZoneHint}
            />
          ) : null}
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
  copy,
}: {
  equipment: KillCardItem[];
  locale: string;
  copy: KillCardCopy;
}) {
  const bySlot = new Map(
    equipment
      .filter((item) => item.slot != null)
      .map((item) => [item.slot as string, item])
  );

  if (bySlot.size === 0) return null;

  const slotLabel = (slot: string): string => {
    switch (slot) {
      case "MainHand":
        return copy.mainHand;
      case "OffHand":
        return copy.offHand;
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
  copy,
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
  copy: KillCardCopy;
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
          <BuildStrip equipment={equipment ?? []} locale={locale} copy={copy} />
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

type HomeFightWeapon = {
  itemType: string;
  quality: number | null;
  displayNames?: Record<string, string>;
} | null | undefined;

function KillCardNameLine({
  name,
  allianceTag,
  region,
  albionId,
  itemPower,
  isVictim = false,
  className,
}: {
  name: string;
  allianceTag?: string | null;
  region: string;
  albionId?: string;
  itemPower?: string | null;
  isVictim?: boolean;
  className?: string;
}) {
  const nameClassName = cn(
    "font-semibold hover:underline",
    isVictim ? "text-stat-death" : "text-stat-kill"
  );
  const tag = allianceTag?.trim() || null;

  return (
    <p className={cn("truncate leading-snug", className)}>
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
}

function KillCardGuildLine({
  guild,
  region,
  className,
}: {
  guild?: { name: string; albionId?: string } | null;
  region: string;
  className?: string;
}) {
  if (!guild?.name) return null;

  return (
    <p className={cn("truncate text-xs leading-tight text-muted-foreground", className)}>
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
  );
}

function HomeWeaponIcon({
  weapon,
  locale,
  className,
}: {
  weapon: HomeFightWeapon;
  locale: string;
  className?: string;
}) {
  if (!weapon) return null;

  return (
    <div className={cn("relative shrink-0 size-10", className)}>
      <ItemIcon
        itemType={weapon.itemType}
        quality={weapon.quality ?? 1}
        alt="weapon"
        tooltip={itemDisplayName(weapon, locale)}
        fill
      />
    </div>
  );
}

function HomeFightDivider({ label }: { label: string }) {
  return (
    <span className="shrink-0 px-0.5 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

function HomeFightRow({
  killer,
  victim,
  region,
  locale,
  killedLabel,
}: {
  killer: {
    name: string;
    guild?: { name: string; albionId?: string } | null;
    allianceTag?: string | null;
    albionId?: string;
    itemPower?: string | null;
    weapon: HomeFightWeapon;
  };
  victim: {
    name: string;
    guild?: { name: string; albionId?: string } | null;
    allianceTag?: string | null;
    albionId?: string;
    itemPower?: string | null;
    weapon: HomeFightWeapon;
  };
  region: string;
  locale: string;
  killedLabel: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <HomeWeaponIcon weapon={killer.weapon} locale={locale} />
        <div className="min-w-0 flex-1">
          <KillCardNameLine
            name={killer.name}
            allianceTag={killer.allianceTag}
            region={region}
            albionId={killer.albionId}
            itemPower={killer.itemPower}
            className="text-xs"
          />
          <KillCardGuildLine guild={killer.guild} region={region} />
        </div>
      </div>
      <HomeFightDivider label={killedLabel} />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <HomeWeaponIcon weapon={victim.weapon} locale={locale} />
        <div className="min-w-0 flex-1">
          <KillCardNameLine
            name={victim.name}
            allianceTag={victim.allianceTag}
            region={region}
            albionId={victim.albionId}
            itemPower={victim.itemPower}
            isVictim
            className="text-xs"
          />
          <KillCardGuildLine guild={victim.guild} region={region} />
        </div>
      </div>
    </div>
  );
}
