import type { AlbionRegion } from "@/lib/albion/types";
import type { GearValueItem } from "@/lib/market/estimate-gear-value";
import { estimateEquipmentValue } from "@/lib/market/estimate-gear-value";
import type { KillDetailItem } from "@/components/KillDetailView";
import {
  KillGearSection,
  type KillGearSectionProps,
} from "@/components/KillGearSection";

function toGearValueItems(items: KillDetailItem[]): GearValueItem[] {
  return items.map((item) => ({
    itemType: item.itemType,
    quality: item.quality,
    count: item.count,
  }));
}

export async function KillGearWithEstimates({
  region,
  killerEquipment,
  victimEquipment,
  killerIp,
  victimIp,
}: {
  region: AlbionRegion;
  killerEquipment: KillDetailItem[];
  victimEquipment: KillDetailItem[];
  killerIp: string | null;
  victimIp: string | null;
}) {
  const [killerValue, victimValue] = await Promise.all([
    estimateEquipmentValue(region, toGearValueItems(killerEquipment)).catch(
      () => null
    ),
    estimateEquipmentValue(region, toGearValueItems(victimEquipment)).catch(
      () => null
    ),
  ]);

  const killerEstSilver =
    killerValue && killerValue.totalSilver > 0 ? killerValue.totalSilver : null;
  const victimEstSilver =
    victimValue && victimValue.totalSilver > 0 ? victimValue.totalSilver : null;

  return (
    <KillGearSection
      killerEquipment={killerEquipment}
      victimEquipment={victimEquipment}
      killerIp={killerIp}
      victimIp={victimIp}
      killerEstSilver={killerEstSilver}
      victimEstSilver={victimEstSilver}
    />
  );
}

export function KillGearFallback({
  killerEquipment = [],
  victimEquipment = [],
  killerIp = null,
  victimIp = null,
}: Partial<KillGearSectionProps> = {}) {
  return (
    <KillGearSection
      killerEquipment={killerEquipment}
      victimEquipment={victimEquipment}
      killerIp={killerIp}
      victimIp={victimIp}
      loading
    />
  );
}

export type { KillGearSectionProps };
