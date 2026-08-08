import { ItemIcon } from "@/components/ItemIcon";
import { cn, formatItemName } from "@/lib/utils";
interface GearItem {
  slot?: string | null;
  itemType: string;
  quality?: number | null;
  count?: number | null;
  category?: string;
}

interface GearGridProps {
  items: GearItem[];
  title?: string;
  compact?: boolean;
}

const SLOT_ORDER = [
  "MainHand",
  "OffHand",
  "Head",
  "Armor",
  "Shoes",
  "Bag",
  "Cape",
  "Mount",
  "Food",
  "Potion",
];

export function GearGrid({ items, title, compact = false }: GearGridProps) {
  const equipment = items.filter((i) => i.category === "equipment" || SLOT_ORDER.includes(i.slot ?? ""));
  const inventory = items.filter((i) => i.category === "inventory");

  const sortedEquipment = [...equipment].sort((a, b) => {
    const ai = SLOT_ORDER.indexOf(a.slot ?? "");
    const bi = SLOT_ORDER.indexOf(b.slot ?? "");
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No gear data</p>;
  }

  return (
    <div className="space-y-4">
      {title && <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>}

      {sortedEquipment.length > 0 && (
        <div className={cn("grid gap-2", compact ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-5")}>
          {sortedEquipment.map((item, i) => (
            <ItemSlot key={`${item.slot}-${i}`} item={item} showLabel={!compact} />
          ))}
        </div>
      )}

      {inventory.length > 0 && (
        <div>
          <h5 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Loot ({inventory.length} items)
          </h5>
          <div className="flex flex-wrap gap-2">
            {inventory.map((item, i) => (
              <ItemSlot key={`inv-${i}`} item={item} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemSlot({
  item,
  showLabel = true,
  compact = false,
}: {
  item: GearItem;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const quality = item.quality ?? 1;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border border-border bg-muted/30 p-2",
        compact ? "w-14" : "min-w-0"
      )}
    >
      <div className="relative h-14 w-14 shrink-0">
        <ItemIcon
          itemType={item.itemType}
          quality={quality}
          alt={formatItemName(item.itemType)}
          fill
        />
        {(item.count ?? 1) > 1 && (
          <span className="absolute -bottom-1 -right-1 rounded bg-background px-1 text-[10px] font-bold">
            {item.count}
          </span>
        )}
      </div>
      {showLabel && !compact && (
        <span className="w-full truncate text-center text-[10px] text-muted-foreground">
          {item.slot ?? "Item"}
        </span>
      )}
    </div>
  );
}
