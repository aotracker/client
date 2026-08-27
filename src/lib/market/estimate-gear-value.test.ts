import { describe, expect, it } from "vitest";
import {
  mergeLiveVictimSilver,
  splitPricedItemGroups,
  type ItemValueEstimate,
} from "./estimate-gear-value";

function priced(
  itemType: string,
  totalSilver: number
): ItemValueEstimate {
  return {
    itemType,
    quality: 1,
    count: 1,
    unitSilver: totalSilver,
    totalSilver,
  };
}

describe("splitPricedItemGroups", () => {
  it("keeps group totals in input order", () => {
    const [gear, loot] = splitPricedItemGroups(
      [2, 1],
      [priced("sword", 600_000), priced("armor", 80_000), priced("rune", 5_000)]
    );

    expect(gear.totalSilver).toBe(680_000);
    expect(gear.itemCount).toBe(2);
    expect(loot.totalSilver).toBe(5_000);
    expect(loot.itemCount).toBe(1);
  });
});

describe("mergeLiveVictimSilver", () => {
  it("uses live totals when victim items priced above stored ingest snapshots", () => {
    expect(
      mergeLiveVictimSilver({
        hasVictimItems: true,
        storedGear: 119_606,
        storedLoot: 0,
        liveGear: 935_546,
        liveLoot: 0,
      })
    ).toEqual({
      gearEstSilver: 935_546,
      lootEstSilver: 0,
    });
  });

  it("keeps stored snapshots when items were evicted", () => {
    expect(
      mergeLiveVictimSilver({
        hasVictimItems: false,
        storedGear: 119_606,
        storedLoot: 0,
        liveGear: 0,
        liveLoot: 0,
      })
    ).toEqual({
      gearEstSilver: 119_606,
      lootEstSilver: 0,
    });
  });

  it("keeps stored snapshots when live pricing resolved nothing", () => {
    expect(
      mergeLiveVictimSilver({
        hasVictimItems: true,
        storedGear: 119_606,
        storedLoot: 12_000,
        liveGear: 0,
        liveLoot: 0,
      })
    ).toEqual({
      gearEstSilver: 119_606,
      lootEstSilver: 12_000,
    });
  });
});
