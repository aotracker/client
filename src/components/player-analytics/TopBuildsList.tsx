"use client";

import { useLocale, useTranslations } from "next-intl";
import { ItemIcon } from "@/components/ItemIcon";
import { WeaponRoleBadge } from "@/components/WeaponRoleBadge";
import { ArmorClassBadge } from "@/components/ArmorClassBadge";
import { formatItemName } from "@/lib/utils";
import { TOP_BUILD_SLOTS } from "@/lib/albion/types";
import type { PlayerTopBuild } from "@/lib/db/queries";
import { pickLocalizedName } from "@/lib/items/localized-name";

interface TopBuildsListProps {
  topBuilds: PlayerTopBuild[];
}

export function TopBuildsList({ topBuilds }: TopBuildsListProps) {
  const locale = useLocale();
  const t = useTranslations("Builds");
  const tCommon = useTranslations("Common");

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

  if (topBuilds.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No build data in the last 30 days
      </p>
    );
  }

  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {topBuilds.map((build, index) => {
        const bySlot = new Map(build.items.map((item) => [item.slot, item]));
        const mainHand = build.items.find((item) => item.slot === "MainHand");
        const title = !mainHand
          ? t("unknownBuild")
          : pickLocalizedName(
              build.titleNames,
              locale,
              formatItemName(mainHand.itemType)
            );

        return (
          <li
            key={`${title}-${index}`}
            className="rounded-md border border-border/60 bg-muted/20 p-3"
          >
            <div className="mb-2 flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-sm font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium leading-snug break-words">
                    {title}
                  </p>
                  <WeaponRoleBadge role={build.weaponRole} />
                  <ArmorClassBadge armorClass={build.armorClass} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {build.count} event{build.count === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {TOP_BUILD_SLOTS.map((slot) => {
                const item = bySlot.get(slot);
                if (!item) return null;
                const label = pickLocalizedName(
                  item.displayNames,
                  locale,
                  formatItemName(item.itemType)
                );

                return (
                  <div
                    key={slot}
                    className="flex items-center justify-center rounded-md border border-border/50 bg-card/60 p-1 leading-none"
                  >
                    <ItemIcon
                      itemType={item.itemType}
                      quality={item.quality}
                      tooltip={`${slotLabel(slot)}: ${label}`}
                      width={48}
                      height={48}
                      className="block object-contain"
                    />
                  </div>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
