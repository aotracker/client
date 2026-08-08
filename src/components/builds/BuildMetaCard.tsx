import { ItemIcon } from "@/components/ItemIcon";
import { WeaponRoleBadge } from "@/components/WeaponRoleBadge";
import { getCatalogItemName, getItemFamilyDisplayName } from "@/lib/items/catalog";
import { TOP_BUILD_SLOTS } from "@/lib/albion/types";
import type { MetaBuildEntry } from "@/lib/db/queries";
import { cn, formatItemPower, formatItemName } from "@/lib/utils";

interface BuildMetaCardProps {
  build: MetaBuildEntry;
  accentClassName: string;
}

function buildTitle(items: MetaBuildEntry["items"]): string {
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

export function BuildMetaCard({
  build,
  accentClassName,
}: BuildMetaCardProps) {
  const bySlot = new Map(build.items.map((item) => [item.slot, item]));
  const title = buildTitle(build.items);
  const avgIp = formatItemPower(build.avgIp);

  const stats = [
    {
      label: "Uses",
      value: build.appearances.toLocaleString(),
      className: undefined as string | undefined,
    },
    {
      label: "Assists",
      value: build.assists.toLocaleString(),
      className: undefined,
    },
    {
      label: "Kills",
      value: build.kills.toLocaleString(),
      className: "text-stat-kill",
    },
    {
      label: "Deaths",
      value: build.deaths.toLocaleString(),
      className: "text-stat-death",
    },
    {
      label: "Avg IP",
      value: avgIp ?? "—",
      className: "text-stat-ip",
    },
  ];

  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/70 bg-card/80 p-4",
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
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-sm font-semibold leading-snug break-words">
                {title}
              </p>
              <WeaponRoleBadge
                itemType={bySlot.get("MainHand")?.itemType}
              />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {build.uniquePlayers} player
              {build.uniquePlayers === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {TOP_BUILD_SLOTS.map((slot) => {
            const item = bySlot.get(slot);
            if (!item) return null;
            const label =
              getCatalogItemName(item.itemType) ?? formatItemName(item.itemType);

            return (
              <div
                key={slot}
                className="flex items-center justify-center rounded-md border border-border/50 bg-muted/30 p-0.5 leading-none"
                title={`${slotLabel(slot)}: ${label}`}
              >
                <ItemIcon
                  itemType={item.itemType}
                  quality={item.quality}
                  width={64}
                  height={64}
                  className="block object-contain"
                />
              </div>
            );
          })}
        </div>

        <dl className="grid grid-cols-5 divide-x divide-border/60 rounded-md border border-border/50 bg-muted/20">
          {stats.map((stat) => (
            <div key={stat.label} className="px-1 py-2 text-center sm:px-2">
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
          ))}
        </dl>
      </div>
    </li>
  );
}
