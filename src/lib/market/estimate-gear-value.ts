import type { AlbionRegion } from "@/lib/albion/types";
import {
  itemIconIdentifier,
  normalizeItemQuality,
} from "@/lib/item-icons";
import { priceKey } from "@/lib/market/aodp";
import { getUnitPrices } from "@/lib/market/price-cache";

export interface GearValueItem {
  itemType: string;
  quality?: number | null;
  count?: number | null;
}

export interface ItemValueEstimate {
  itemType: string;
  quality: number;
  count: number;
  unitSilver: number;
  totalSilver: number;
}

export interface GearValueEstimate {
  totalSilver: number;
  pricedItemCount: number;
  itemCount: number;
  items: ItemValueEstimate[];
}

/**
 * Estimate market silver per item using AODP prices (cached).
 * Soft-fails to zeros if the market API is unavailable.
 */
export async function estimateItemValues(
  region: AlbionRegion,
  items: GearValueItem[]
): Promise<GearValueEstimate> {
  const itemCount = items.length;
  if (itemCount === 0) {
    return { totalSilver: 0, pricedItemCount: 0, itemCount: 0, items: [] };
  }

  const resolved = items.map((item) => ({
    itemType: item.itemType,
    itemId: itemIconIdentifier(item.itemType),
    quality: normalizeItemQuality(item.quality),
    count: Math.max(item.count ?? 1, 1),
  }));

  const lookups = resolved.map(({ itemId, quality }) => ({ itemId, quality }));
  // Ensure quality-1 fallbacks are available in the same cache round-trip.
  for (const { itemId, quality } of resolved) {
    if (quality !== 1) {
      lookups.push({ itemId, quality: 1 });
    }
  }

  let prices: Map<string, number>;
  try {
    prices = await getUnitPrices(region, lookups);
  } catch {
    return {
      totalSilver: 0,
      pricedItemCount: 0,
      itemCount,
      items: resolved.map((item) => ({
        itemType: item.itemType,
        quality: item.quality,
        count: item.count,
        unitSilver: 0,
        totalSilver: 0,
      })),
    };
  }

  let totalSilver = 0;
  let pricedItemCount = 0;
  const pricedItems: ItemValueEstimate[] = [];

  for (const { itemType, itemId, quality, count } of resolved) {
    let unitPrice = prices.get(priceKey(itemId, quality)) ?? 0;
    if (unitPrice <= 0 && quality !== 1) {
      unitPrice = prices.get(priceKey(itemId, 1)) ?? 0;
    }
    const lineTotal = unitPrice > 0 ? unitPrice * count : 0;
    if (unitPrice > 0) {
      totalSilver += lineTotal;
      pricedItemCount += 1;
    }
    pricedItems.push({
      itemType,
      quality,
      count,
      unitSilver: unitPrice,
      totalSilver: lineTotal,
    });
  }

  return { totalSilver, pricedItemCount, itemCount, items: pricedItems };
}

/** Split one priced-item list back into the group sizes passed to a batched estimate. */
export function splitPricedItemGroups(
  groupSizes: number[],
  pricedItems: ItemValueEstimate[]
): GearValueEstimate[] {
  let offset = 0;
  return groupSizes.map((size) => {
    const items = pricedItems.slice(offset, offset + size);
    offset += size;
    const totalSilver = items.reduce((sum, item) => sum + item.totalSilver, 0);
    const pricedItemCount = items.filter((item) => item.totalSilver > 0).length;
    return {
      totalSilver,
      pricedItemCount,
      itemCount: size,
      items,
    };
  });
}

/**
 * Same pricing as `estimateItemValues`, one market lookup for many item groups.
 */
export async function estimateGroupedItemValues(
  region: AlbionRegion,
  groups: GearValueItem[][]
): Promise<GearValueEstimate[]> {
  if (groups.length === 0) return [];
  const estimate = await estimateItemValues(region, groups.flat());
  return splitPricedItemGroups(
    groups.map((group) => group.length),
    estimate.items
  );
}

/** Prefer live AODP-backed totals when victim items are present; else stored ingest snapshots. */
export function mergeLiveVictimSilver(opts: {
  hasVictimItems: boolean;
  storedGear: number | null | undefined;
  storedLoot: number | null | undefined;
  liveGear: number;
  liveLoot: number;
}): { gearEstSilver: number | null; lootEstSilver: number | null } {
  const liveGear = Math.floor(opts.liveGear);
  const liveLoot = Math.floor(opts.liveLoot);
  if (opts.hasVictimItems && (liveGear > 0 || liveLoot > 0)) {
    return {
      gearEstSilver: liveGear > 0 ? liveGear : 0,
      lootEstSilver: liveLoot > 0 ? liveLoot : 0,
    };
  }
  return {
    gearEstSilver: opts.storedGear ?? null,
    lootEstSilver: opts.storedLoot ?? null,
  };
}

/**
 * Estimate total market silver for equipped gear using AODP prices (cached).
 * Soft-fails to zeros if the market API is unavailable.
 */
export async function estimateEquipmentValue(
  region: AlbionRegion,
  items: GearValueItem[]
): Promise<GearValueEstimate> {
  return estimateItemValues(region, items);
}
