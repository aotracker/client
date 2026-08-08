import { and, eq, inArray, sql } from "drizzle-orm";
import type { AlbionRegion } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";
import {
  fetchCurrentUnitPrices,
  priceKey,
  type PriceKey,
} from "@/lib/market/aodp";

export const PRICE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface PriceLookup {
  itemId: string;
  quality: number;
}

function isFresh(updatedAt: Date, now: number): boolean {
  return now - updatedAt.getTime() < PRICE_CACHE_TTL_MS;
}

/**
 * Resolve unit prices for (itemId, quality) pairs using the Postgres cache,
 * refreshing stale/missing entries from AODP in one batched fetch.
 */
export async function getUnitPrices(
  region: AlbionRegion,
  lookups: PriceLookup[]
): Promise<Map<PriceKey, number>> {
  const unique = new Map<PriceKey, PriceLookup>();
  for (const lookup of lookups) {
    unique.set(priceKey(lookup.itemId, lookup.quality), lookup);
  }

  if (unique.size === 0) return new Map();

  const itemIds = [...new Set([...unique.values()].map((l) => l.itemId))];
  const now = Date.now();
  const result = new Map<PriceKey, number>();
  const missing: PriceLookup[] = [];

  const cached = await db
    .select()
    .from(schema.itemMarketPrices)
    .where(
      and(
        eq(schema.itemMarketPrices.region, region),
        inArray(schema.itemMarketPrices.itemId, itemIds)
      )
    );

  const cacheByKey = new Map<PriceKey, (typeof cached)[number]>();
  for (const row of cached) {
    cacheByKey.set(priceKey(row.itemId, row.quality), row);
  }

  for (const [key, lookup] of unique) {
    const row = cacheByKey.get(key);
    if (row && isFresh(row.updatedAt, now)) {
      result.set(key, row.unitPrice);
    } else {
      missing.push(lookup);
    }
  }

  if (missing.length === 0) return result;

  const fetchItemIds = [...new Set(missing.map((m) => m.itemId))];
  const fetchQualities = [
    ...new Set([...missing.map((m) => m.quality), 1]),
  ];

  let fetched = new Map<PriceKey, number>();
  try {
    fetched = await fetchCurrentUnitPrices(region, fetchItemIds, fetchQualities);
  } catch {
    // Soft-fail: keep any fresh cache hits; missing stay unresolved (0).
  }

  const upserts: {
    region: AlbionRegion;
    itemId: string;
    quality: number;
    unitPrice: number;
    updatedAt: Date;
  }[] = [];
  const updatedAt = new Date();

  // Cache every requested key (and quality-1 fallbacks we fetched).
  const keysToCache = new Set<PriceKey>();
  for (const lookup of missing) {
    keysToCache.add(priceKey(lookup.itemId, lookup.quality));
    keysToCache.add(priceKey(lookup.itemId, 1));
  }

  for (const key of keysToCache) {
    const [itemId, qualityStr] = key.split(":");
    const quality = parseInt(qualityStr, 10);
    const unitPrice = fetched.get(key) ?? 0;
    upserts.push({ region, itemId, quality, unitPrice, updatedAt });
    if (unique.has(key)) {
      result.set(key, unitPrice);
    }
  }

  if (upserts.length > 0) {
    await db
      .insert(schema.itemMarketPrices)
      .values(upserts)
      .onConflictDoUpdate({
        target: [
          schema.itemMarketPrices.region,
          schema.itemMarketPrices.itemId,
          schema.itemMarketPrices.quality,
        ],
        set: {
          unitPrice: sql`excluded.unit_price`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  return result;
}
