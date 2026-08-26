import type { AlbionRegion } from "@/lib/albion/types";
import {
  aggregateUnitPrices,
  type AodpPriceRow,
  type PriceKey,
} from "./aggregate-unit-prices";

export {
  aggregateUnitPrices,
  priceKey,
  type AodpPriceRow,
  type PriceKey,
} from "./aggregate-unit-prices";

export const AODP_BASE_URLS: Record<AlbionRegion, string> = {
  americas: "https://west.albion-online-data.com",
  europe: "https://europe.albion-online-data.com",
  asia: "https://east.albion-online-data.com",
};

const AODP_TIMEOUT_MS = 8_000;
const MAX_URL_LENGTH = 4096;

function buildPricesUrl(
  baseUrl: string,
  itemIds: string[],
  qualities: number[]
): string {
  const itemsPath = itemIds.map(encodeURIComponent).join(",");
  const qualitiesParam = qualities.join(",");
  return `${baseUrl}/api/v2/stats/prices/${itemsPath}.json?qualities=${qualitiesParam}`;
}

/** Split item IDs so each request URL stays under AODP's 4096-char limit. */
export function batchItemIds(
  baseUrl: string,
  itemIds: string[],
  qualities: number[]
): string[][] {
  if (itemIds.length === 0) return [];

  const batches: string[][] = [];
  let current: string[] = [];

  for (const itemId of itemIds) {
    const candidate = [...current, itemId];
    const url = buildPricesUrl(baseUrl, candidate, qualities);
    if (url.length > MAX_URL_LENGTH && current.length > 0) {
      batches.push(current);
      current = [itemId];
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) batches.push(current);
  return batches;
}

async function fetchPriceBatch(
  baseUrl: string,
  itemIds: string[],
  qualities: number[]
): Promise<AodpPriceRow[]> {
  const url = buildPricesUrl(baseUrl, itemIds, qualities);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AODP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`AODP HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data as AodpPriceRow[];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch current market prices for the given item IDs and qualities.
 * Returns aggregated unit prices (median sell after dropping troll listings).
 */
export async function fetchCurrentUnitPrices(
  region: AlbionRegion,
  itemIds: string[],
  qualities: number[]
): Promise<Map<PriceKey, number>> {
  const uniqueItems = [...new Set(itemIds.filter(Boolean))];
  const uniqueQualities = [
    ...new Set(qualities.filter((q) => Number.isFinite(q) && q >= 1 && q <= 5)),
  ].sort((a, b) => a - b);

  if (uniqueItems.length === 0 || uniqueQualities.length === 0) {
    return new Map();
  }

  const baseUrl = AODP_BASE_URLS[region];
  const batches = batchItemIds(baseUrl, uniqueItems, uniqueQualities);
  const allRows: AodpPriceRow[] = [];

  for (const batch of batches) {
    const rows = await fetchPriceBatch(baseUrl, batch, uniqueQualities);
    allRows.push(...rows);
  }

  return aggregateUnitPrices(allRows);
}
