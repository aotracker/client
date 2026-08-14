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
