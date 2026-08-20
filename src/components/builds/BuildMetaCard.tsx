"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ItemIcon } from "@/components/ItemIcon";
import { Tooltip } from "@/components/ui/tooltip";
import { WeaponRoleBadge } from "@/components/WeaponRoleBadge";
import { ArmorClassBadge } from "@/components/ArmorClassBadge";
import { TOP_BUILD_SLOTS } from "@/lib/albion/types";
import type { MetaBuildEntry } from "@/lib/db/queries";
import { pickLocalizedName } from "@/lib/items/localized-name";
import { cn, formatFame, formatItemPower, formatItemName } from "@/lib/utils";

interface BuildMetaCardProps {
  build: MetaBuildEntry;
  accentClassName: string;
  weaponHref?: string;
}

export function BuildMetaCard({
  build,
  accentClassName,
  weaponHref,
}: BuildMetaCardProps) {
  const locale = useLocale();
  const t = useTranslations("Builds");
  const tCommon = useTranslations("Common");
  const bySlot = new Map(build.items.map((item) => [item.slot, item]));

  const mainHand = build.items.find((i) => i.slot === "MainHand");
  const title = !mainHand
    ? t("unknownBuild")
    : pickLocalizedName(
        build.titleNames,
        locale,
        formatItemName(mainHand.itemType)
      );

  const avgIp = formatItemPower(build.avgIp);
  const kdReliable = build.kd != null;
  const kdLabel =
    !kdReliable
      ? tCommon("labels.emDash")
      : build.deaths === 0 && build.kills > 0
        ? t("kdInfinite")
        : build.kd!.toFixed(1);

  const slotLabel = (slot: string): string => {
    switch (slot) {
      case "MainHand":
        return tCommon("labels.mainHand");
      case "OffHand":
        return tCommon("labels.offHand");
      case "Head":
        return tCommon("labels.head");
      case "Armor":
        return tCommon("labels.armor");
      case "Shoes":
        return tCommon("labels.shoes");
      default:
        return slot;
    }
  };

  const stats = [
    {
      label: tCommon("stats.uses"),
      value: build.appearances.toLocaleString(),
      className: undefined as string | undefined,
      title: t("stats.usageTooltip"),
    },
    {
      label: tCommon("stats.kdShort"),
      value: kdLabel,
      className: kdReliable ? undefined : "text-muted-foreground",
      title: kdReliable ? undefined : t("kdUnreliable"),
    },
    {
      label: tCommon("stats.avgIp"),
      value: avgIp ?? tCommon("labels.emDash"),
      className: "text-stat-ip",
      title: undefined,
    },
    {
      label: tCommon("stats.kills"),
      value: build.kills.toLocaleString(),
      className: "text-stat-kill",
      title: undefined,
    },
    {
      label: tCommon("stats.deaths"),
      value: build.deaths.toLocaleString(),
      className: "text-stat-death",
      title: undefined,
    },
    {
      label: tCommon("stats.assists"),
      value: build.assists.toLocaleString(),
      className: undefined,
      title: undefined,
    },
  ];

  const titleNode = (
    <p className="font-display text-sm font-semibold leading-snug break-words">
      {title}
    </p>
  );

  return (
    <li
      className={cn(
        "relative overflow-visible rounded-lg border border-border/70 bg-card/80 p-4",
        "transition-colors hover:border-border hover:bg-card"
      )}
    >
      <div
        className={cn("absolute inset-y-0 left-0 w-1", accentClassName)}
        aria-hidden
      />

      <div className="flex flex-col gap-3 pl-2">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 font-display text-sm font-semibold tabular-nums text-muted-foreground">
            {build.rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 overflow-visible">
              {weaponHref ? (
                <Link
                  href={weaponHref}
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {titleNode}
                </Link>
              ) : (
                titleNode
              )}
              <WeaponRoleBadge role={build.weaponRole} />
              <ArmorClassBadge armorClass={build.armorClass} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tCommon("stats.players")}: {build.uniquePlayers}
              {build.usageShare > 0 ? (
                <>
                  {" · "}
                  {t("stats.usageShare", {
                    pct: (build.usageShare * 100).toFixed(1),
                  })}
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 overflow-visible">
          {TOP_BUILD_SLOTS.map((slot) => {
            const item = bySlot.get(slot);
            if (!item) {
              return (
                <Tooltip
                  key={slot}
                  content={t("emptySlot", { slot: slotLabel(slot) })}
                  block
                  className="flex size-[68px] items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/10 text-[10px] leading-tight text-muted-foreground"
                >
                  <span aria-label={t("emptySlot", { slot: slotLabel(slot) })}>
                    {slotLabel(slot)}
                  </span>
                </Tooltip>
              );
            }
            const label = pickLocalizedName(
              item.displayNames,
              locale,
              formatItemName(item.itemType)
            );

            return (
              <div
                key={slot}
                className="flex items-center justify-center rounded-md border border-border/50 bg-muted/30 p-0.5 leading-none"
              >
                <ItemIcon
                  itemType={item.itemType}
                  quality={item.quality}
                  tooltip={`${slotLabel(slot)}: ${label}`}
                  tooltipAlign="start"
                  width={64}
                  height={64}
                  className="block object-contain"
                />
              </div>
            );
          })}
        </div>

        <dl className="grid grid-cols-3 divide-x divide-y divide-border/60 overflow-hidden rounded-md border border-border/50 bg-muted/20 sm:grid-cols-6 sm:divide-y-0">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-1 py-2 sm:px-2"
            >
              <Tooltip content={stat.title} side="bottom" block className="w-full text-center">
                <div>
                  <dt className="text-[10px] leading-tight text-muted-foreground sm:text-xs">
                    {stat.label}
                  </dt>
                  <dd
                    className={cn(
                      "mt-0.5 text-xs font-semibold tabular-nums sm:text-sm",
                      stat.className
                    )}
                  >
                    {stat.value}
                  </dd>
                </div>
              </Tooltip>
            </div>
          ))}
        </dl>

        {build.avgFame > 0 ? (
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {t("stats.avgFame")}: {formatFame(build.avgFame)}
          </p>
        ) : null}
      </div>
    </li>
  );
}
