import { describe, expect, it } from "vitest";
import type { PlayerBuildItem } from "./fingerprint";
import {
  META_KD_MIN_APPEARANCES,
  compareMetaBuilds,
  filterSortSliceMetaBuilds,
  isMetaKdReliable,
  matchesMetaBuildFilters,
  metaBuildKd,
  metaBuildKdOrNull,
  selectMetaBuildsForCache,
  type MetaBuildSortable,
} from "./meta";

function item(slot: string, itemType: string): PlayerBuildItem {
  return { slot, itemType, quality: 4 };
}

function build(
  overrides: Partial<MetaBuildSortable> & { name?: string }
): MetaBuildSortable & { name?: string } {
  return {
    kills: 0,
    deaths: 0,
    appearances: 0,
    uniquePlayers: 1,
    totalFame: 0,
    kd: null,
    weaponRole: "dps",
    armorClass: "plate",
    items: [item("MainHand", "T8_MAIN_SWORD")],
    ...overrides,
  };
}

describe("K/D", () => {
  it("uses kills/deaths and treats zero deaths as kills", () => {
    expect(metaBuildKd(10, 5)).toBe(2);
    expect(metaBuildKd(8, 0)).toBe(8);
    expect(metaBuildKd(0, 0)).toBe(0);
  });

  it("hides K/D below the min sample", () => {
    expect(isMetaKdReliable(META_KD_MIN_APPEARANCES - 1)).toBe(false);
    expect(metaBuildKdOrNull(10, 1, META_KD_MIN_APPEARANCES - 1)).toBeNull();
    expect(metaBuildKdOrNull(10, 5, META_KD_MIN_APPEARANCES)).toBe(2);
  });
});

describe("matchesMetaBuildFilters", () => {
  const healerCloth = build({
    weaponRole: "healer",
    armorClass: "cloth",
    items: [item("MainHand", "T8_2H_HOLYSTAFF")],
  });

  it("keeps all builds when filters are all/empty", () => {
    expect(matchesMetaBuildFilters(healerCloth, {})).toBe(true);
  });

  it("filters by role, armor, and weapon family", () => {
    expect(
      matchesMetaBuildFilters(healerCloth, { role: "healer", armor: "cloth" })
    ).toBe(true);
    expect(matchesMetaBuildFilters(healerCloth, { role: "dps" })).toBe(false);
    expect(matchesMetaBuildFilters(healerCloth, { armor: "plate" })).toBe(false);
    expect(
      matchesMetaBuildFilters(healerCloth, { weapon: "2H_HOLYSTAFF" })
    ).toBe(true);
    expect(
      matchesMetaBuildFilters(healerCloth, { weapon: "MAIN_SWORD" })
    ).toBe(false);
  });
});

describe("compareMetaBuilds / filterSortSliceMetaBuilds", () => {
  const popularHealer = build({
    name: "healer",
    weaponRole: "healer",
    armorClass: "cloth",
    appearances: 4,
    uniquePlayers: 3,
    kills: 1,
    deaths: 2,
    totalFame: 1_000,
    kd: null,
    items: [item("MainHand", "T8_2H_HOLYSTAFF")],
  });
  const rareDps = build({
    name: "dps",
    weaponRole: "dps",
    armorClass: "plate",
    appearances: 80,
    uniquePlayers: 8,
    kills: 40,
    deaths: 2,
    totalFame: 50_000,
    kd: null,
    items: [item("MainHand", "T8_MAIN_SWORD")],
  });
  const midDps = build({
    name: "mid",
    weaponRole: "dps",
    armorClass: "leather",
    appearances: 40,
    uniquePlayers: 20,
    kills: 30,
    deaths: 10,
    totalFame: 20_000,
    kd: 3,
    items: [item("MainHand", "T8_2H_DAGGERPAIR")],
  });

  it("ranks by usage so a popular support outranks a rarer DPS", () => {
    const healer = build({
      appearances: 200,
      weaponRole: "healer",
      kills: 2,
    });
    const dps = build({
      appearances: 20,
      weaponRole: "dps",
      kills: 18,
    });
    expect(compareMetaBuilds(healer, dps, "usage")).toBeLessThan(0);
  });

  it("orders the sample by usage count", () => {
    const ranked = [rareDps, popularHealer, midDps].sort((a, b) =>
      compareMetaBuilds(a, b, "usage")
    );
    expect(ranked.map((entry) => entry.name)).toEqual(["dps", "mid", "healer"]);
  });

  it("sorts by reliable K/D and parks unreliable samples last", () => {
    const ranked = [rareDps, popularHealer, midDps].sort((a, b) =>
      compareMetaBuilds(a, b, "kd")
    );
    expect(ranked.map((entry) => entry.name)).toEqual(["mid", "dps", "healer"]);
  });

  it("sorts by kills", () => {
    const ranked = [rareDps, popularHealer, midDps].sort((a, b) =>
      compareMetaBuilds(a, b, "kills")
    );
    expect(ranked[0]?.name).toBe("dps");
  });

  it("applies role filter before the slice so healers are not dropped", () => {
    const dpsHeavy = [
      rareDps,
      midDps,
      ...Array.from({ length: 12 }, (_, i) =>
        build({
          name: `dps-${i}`,
          appearances: 50 - i,
          weaponRole: "dps",
        })
      ),
      popularHealer,
    ];

    const slicedWithoutFilter = filterSortSliceMetaBuilds(dpsHeavy, {
      sort: "usage",
      limit: 12,
    });
    expect(slicedWithoutFilter.some((entry) => entry.weaponRole === "healer")).toBe(
      false
    );

    const healers = filterSortSliceMetaBuilds(dpsHeavy, {
      sort: "usage",
      role: "healer",
      limit: 12,
    });
    expect(healers).toHaveLength(1);
    expect(healers[0]?.name).toBe("healer");
  });
});

describe("selectMetaBuildsForCache", () => {
  it("keeps niche healers that fall outside the usage cap", () => {
    const healer = build({
      name: "healer",
      weaponRole: "healer",
      appearances: 2,
      items: [item("MainHand", "T8_2H_HOLYSTAFF")],
    });
    const crowd = Array.from({ length: 30 }, (_, i) =>
      build({
        name: `dps-${i}`,
        appearances: 100 - i,
        weaponRole: "dps",
        items: [item("MainHand", `T8_MAIN_SWORD_${i}`)],
      })
    );

    const kept = selectMetaBuildsForCache([...crowd, healer], {
      keepUsage: 10,
      keepPerFacet: 3,
    });

    expect(kept.length).toBeLessThan(crowd.length + 1);
    expect(kept.some((entry) => entry.name === "healer")).toBe(true);
  });
});
