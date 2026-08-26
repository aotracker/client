import { describe, expect, it } from "vitest";
import {
  aggregateUnitPrices,
  type AodpPriceRow,
} from "./aggregate-unit-prices";

function row(
  city: string,
  sell: number,
  buy = 0,
  quality = 1
): AodpPriceRow {
  return {
    item_id: "T4_RUNE",
    city,
    quality,
    sell_price_min: sell,
    buy_price_max: buy,
  };
}

describe("aggregateUnitPrices", () => {
  it("ignores a 100m Thetford troll listing on Adept's Rune", () => {
    const prices = aggregateUnitPrices([
      row("Black Market", 9),
      row("Brecilien", 7, 3),
      row("Bridgewatch", 10, 7),
      row("Caerleon", 10, 6),
      row("Fort Sterling", 9, 9),
      row("Lymhurst", 7, 8),
      row("Martlock", 8, 9),
      row("Thetford", 100_000_000, 7),
    ]);

    expect(prices.get("T4_RUNE:1")).toBe(9);
  });

  it("still drops the troll sell when no buy order is present", () => {
    const prices = aggregateUnitPrices([
      row("Bridgewatch", 10),
      row("Caerleon", 10),
      row("Thetford", 100_000_000),
    ]);

    expect(prices.get("T4_RUNE:1")).toBe(10);
  });

  it("falls back to buy orders when every sell is a troll", () => {
    const prices = aggregateUnitPrices([
      row("Thetford", 100_000_000, 7),
      row("Martlock", 80_000_000, 6),
    ]);

    expect(prices.get("T4_RUNE:1")).toBe(7);
  });

  it("keeps a tight cluster of real city prices", () => {
    const prices = aggregateUnitPrices([
      row("Caerleon", 50_000_000, 40_000_000),
      row("Bridgewatch", 55_000_000, 42_000_000),
      row("Lymhurst", 48_000_000, 39_000_000),
    ]);

    expect(prices.get("T4_RUNE:1")).toBe(50_000_000);
  });

  it("skips zero and empty sell orders", () => {
    const prices = aggregateUnitPrices([
      row("Black Market", 0),
      row("Caerleon", 12, 6),
    ]);

    expect(prices.get("T4_RUNE:1")).toBe(12);
  });
});
