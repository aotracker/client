import { Skeleton } from "@/components/ui/skeleton";
import { SilverValue } from "@/components/SilverValue";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  estimateEquipmentValue,
  type GearValueItem,
} from "@/lib/market/estimate-gear-value";

export async function KillEquipmentValue({
  region,
  items,
}: {
  region: AlbionRegion;
  items: GearValueItem[];
}) {
  const estimate = await estimateEquipmentValue(region, items).catch(
    () => null
  );
  const totalSilver =
    estimate && estimate.totalSilver > 0 ? estimate.totalSilver : null;
  if (totalSilver == null) return null;

  return (
    <SilverValue
      amount={totalSilver}
      className="text-sm text-muted-foreground"
      iconClassName="size-4"
    />
  );
}

export function KillEquipmentValueFallback() {
  return <Skeleton className="h-4 w-14" />;
}
