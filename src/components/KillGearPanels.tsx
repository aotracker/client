import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { ItemIcon } from "@/components/ItemIcon";
import { SilverValue } from "@/components/SilverValue";
import { formatItemTooltip } from "@/lib/items/catalog";
import { formatKillItemTooltip } from "@/lib/items/tooltips";
import { EQUIPMENT_SLOTS, type EquipmentSlot } from "@/lib/albion/types";

export interface GearItem {
  slot?: string | null;
  itemType: string;
  quality?: number | null;
  count?: number | null;
  category?: string;
  estSilver?: number | null;
}

/**
 * Icon overlay positions on public/gear.png (480×520).
 * Values are top-left of a shared-size icon box centered on each parchment slot.
 * MainHand/OffHand sit inset toward Armor; Shoes sits slightly above Food/Potion.
 */
const SLOT_POSITIONS: Record<
  EquipmentSlot,
  { left: string; top: string }
> = {
  Bag: { left: "5.10%", top: "5.67%" },
  Head: { left: "36.98%", top: "8.37%" },
  Cape: { left: "69.27%", top: "5.67%" },
  MainHand: { left: "10.63%", top: "29.33%" },
  Armor: { left: "36.98%", top: "29.33%" },
  OffHand: { left: "64.38%", top: "29.33%" },
  Food: { left: "6.15%", top: "53.94%" },
  Shoes: { left: "36.98%", top: "51.44%" },
  Potion: { left: "68.85%", top: "53.94%" },
  Mount: { left: "36.98%", top: "72.60%" },
};

/** Shared icon size for every equipment slot. */
const SLOT_SIZE = { width: "25%", height: "23.08%" };

const PAPER_DOLL_SLOTS = Object.keys(SLOT_POSITIONS) as EquipmentSlot[];

interface EquipmentGridProps {
  items: GearItem[];
  emptyMessage?: string;
  className?: string;
}

export async function EquipmentGrid({
  items,
  emptyMessage = "No equipment data",
  className,
}: EquipmentGridProps) {
  const locale = await getLocale();
  const tLabels = await getTranslations("Common.labels");
  const estValueLabel = (value: string) => tLabels("estValue", { value });
  const equipment = items.filter(
    (i) =>
      i.category === "equipment" ||
      (i.slot != null && (EQUIPMENT_SLOTS as readonly string[]).includes(i.slot))
  );

  const bySlot = new Map(equipment.map((i) => [i.slot, i]));

  if (equipment.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[480/520] w-full max-w-[280px] sm:max-w-[320px]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local static template */}
      <img
        src="/gear.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        draggable={false}
      />
      {PAPER_DOLL_SLOTS.map((slot) => {
        const item = bySlot.get(slot);
        if (!item) return null;
        const pos = SLOT_POSITIONS[slot];
        return (
          <div
            key={slot}
            className="absolute"
            style={{
              left: pos.left,
              top: pos.top,
              width: SLOT_SIZE.width,
              height: SLOT_SIZE.height,
            }}
          >
            <ItemDisplay
              item={item}
              layout="fill"
              locale={locale}
              estValueLabel={estValueLabel}
            />
          </div>
        );
      })}
    </div>
  );
}

interface LootGridProps {
  items: GearItem[];
  emptyMessage?: string;
}

export async function LootGrid({
  items,
  emptyMessage = "No loot in inventory",
}: LootGridProps) {
  const locale = await getLocale();
  const tLabels = await getTranslations("Common.labels");
  const estValueLabel = (value: string) => tLabels("estValue", { value });
  const loot = items.filter((i) => i.category === "inventory");

  if (loot.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {loot.map((item, i) => (
        <div
          key={`${item.itemType}-${i}`}
          className="flex w-14 shrink-0 flex-col items-center rounded-md border border-border bg-muted/20 p-1"
        >
          <ItemDisplay
            item={item}
            layout="icon"
            locale={locale}
            estValueLabel={estValueLabel}
          />
        </div>
      ))}
    </div>
  );
}

function ItemDisplay({
  item,
  layout = "stack",
  locale,
  estValueLabel,
}: {
  item: GearItem;
  layout?: "stack" | "icon" | "fill";
  locale: string;
  estValueLabel: (value: string) => string;
}) {
  const quality = item.quality ?? 1;
  const dim = layout === "fill" ? "h-full w-full" : "size-12";
  const tooltip = formatKillItemTooltip({
    itemType: item.itemType,
    locale,
    estSilver: item.estSilver,
    estValueLabel,
  });
  const alt = formatItemTooltip(item.itemType, locale);

  const icon = (
    <div className={cn("relative shrink-0", dim)}>
      <ItemIcon
        itemType={item.itemType}
        quality={quality}
        alt={alt}
        tooltip={tooltip}
        fill
      />
      {(item.count ?? 1) > 1 && (
        <span className="absolute bottom-0 right-0 rounded bg-background/90 px-0.5 text-xs font-bold leading-tight">
          {item.count}
        </span>
      )}
    </div>
  );

  if (layout === "fill") {
    return icon;
  }

  if (layout === "icon") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {icon}
        {item.estSilver != null && item.estSilver > 0 && (
          <SilverValue
            amount={item.estSilver}
            className="text-xs text-muted-foreground"
            iconClassName="size-2.5"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-1">{icon}</div>
  );
}
