"use client";

import { ItemIcon } from "@/components/ItemIcon";
import { WeaponRoleBadge } from "@/components/WeaponRoleBadge";
import { getCatalogItemName, getItemFamilyDisplayName } from "@/lib/items/catalog";
import { formatItemName } from "@/lib/utils";
import { TOP_BUILD_SLOTS } from "@/lib/albion/types";
import type { PlayerTopBuild } from "@/lib/db/queries";

interface TopBuildsListProps {
  topBuilds: PlayerTopBuild[];
}

function buildTitle(items: PlayerTopBuild["items"]): string {
  const mainHand = items.find((i) => i.slot === "MainHand");
  if (!mainHand) return "Unknown build";
  return (
    getItemFamilyDisplayName(mainHand.itemType) ??
    getCatalogItemName(mainHand.itemType) ??
    formatItemName(mainHand.itemType)
  );
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

export function TopBuildsList({ topBuilds }: TopBuildsListProps) {
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

        return (
          <li
            key={`${buildTitle(build.items)}-${index}`}
            className="rounded-md border border-border/60 bg-muted/20 p-3"
          >
            <div className="mb-2 flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-sm font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium leading-snug break-words">
                    {buildTitle(build.items)}
                  </p>
                  <WeaponRoleBadge itemType={bySlot.get("MainHand")?.itemType} />
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

                return (
                  <div
                    key={slot}
                    className="flex items-center justify-center rounded-md border border-border/50 bg-card/60 p-1 leading-none"
                    title={`${slotLabel(slot)}: ${getCatalogItemName(item.itemType) ?? formatItemName(item.itemType)}`}
                  >
                    <ItemIcon
                      itemType={item.itemType}
                      quality={item.quality}
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
