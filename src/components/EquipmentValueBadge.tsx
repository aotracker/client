import { formatSilver } from "@/lib/utils";
import {
  estimateEquipmentValue,
  type GearValueItem,
} from "@/lib/market/estimate-gear-value";
import type { AlbionRegion } from "@/lib/albion/types";

interface EquipmentValueBadgeProps {
  region: AlbionRegion;
  items: GearValueItem[];
}

export async function EquipmentValueBadge({
  region,
  items,
}: EquipmentValueBadgeProps) {
  const { totalSilver } = await estimateEquipmentValue(region, items);
  if (totalSilver <= 0) return null;

  return (
    <p className="shrink-0 text-sm text-muted-foreground">
      Est. value: {formatSilver(totalSilver)}
    </p>
  );
}
