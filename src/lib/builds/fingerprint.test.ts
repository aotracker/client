import { describe, expect, it } from "vitest";
import type { AlbionPlayerRef } from "@/lib/albion/types";
import type { PlayerBuildItem } from "./fingerprint";
import {
  buildFingerprint,
  canonicalizeBuildItems,
  extractBuildItemsFromKillItems,
  extractBuildItemsFromParticipantPayload,
  getMainHandItem,
  isSparseBuild,
  preferBuildItems,
  resolveBuildItems,
} from "./fingerprint";

function item(
  slot: string,
  itemType: string,
  quality = 4
): PlayerBuildItem {
  return { slot, itemType, quality };
}

describe("isSparseBuild", () => {
  it("treats 1–2 slot loadouts as sparse", () => {
    expect(isSparseBuild([item("MainHand", "T8_MAIN_SWORD")])).toBe(true);
    expect(
      isSparseBuild([
        item("MainHand", "T8_MAIN_SWORD"),
        item("OffHand", "T8_OFF_SHIELD"),
      ])
    ).toBe(true);
  });

  it("treats 3+ slot loadouts as full", () => {
    expect(
      isSparseBuild([
        item("MainHand", "T8_MAIN_SWORD"),
        item("OffHand", "T8_OFF_SHIELD"),
        item("Armor", "T8_ARMOR_PLATE_SET1"),
      ])
    ).toBe(false);
  });

  it("does not treat an empty list as sparse", () => {
    expect(isSparseBuild([])).toBe(false);
  });
});

describe("buildFingerprint", () => {
  it("groups the same family across tiers, enchants, and quality", () => {
    const low = [
      item("MainHand", "T6_MAIN_SWORD@1", 2),
      item("Armor", "T6_ARMOR_PLATE_SET1", 1),
    ];
    const high = [
      item("MainHand", "T8_MAIN_SWORD@3", 5),
      item("Armor", "T8_ARMOR_PLATE_SET1", 4),
    ];
    expect(buildFingerprint(low)).toBe(buildFingerprint(high));
    expect(buildFingerprint(low)).toBe(
      "MainHand:MAIN_SWORD|Armor:ARMOR_PLATE_SET1"
    );
  });

  it("keeps slot order stable and skips empty slots", () => {
    expect(
      buildFingerprint([
        item("Shoes", "T8_SHOES_LEATHER_SET1"),
        item("MainHand", "T8_2H_HOLYSTAFF"),
      ])
    ).toBe("MainHand:2H_HOLYSTAFF|Shoes:SHOES_LEATHER_SET1");
  });
});

describe("preferBuildItems", () => {
  it("keeps the loadout with more slots", () => {
    const sparse = [item("MainHand", "T8_MAIN_SWORD")];
    const full = [
      item("MainHand", "T4_MAIN_SWORD"),
      item("OffHand", "T4_OFF_SHIELD"),
      item("Armor", "T4_ARMOR_PLATE_SET1"),
    ];
    expect(preferBuildItems(sparse, full)).toBe(full);
    expect(preferBuildItems(full, sparse)).toBe(full);
  });

  it("keeps the higher tier/enchant when slot counts match", () => {
    const low = [item("MainHand", "T5_MAIN_SWORD")];
    const high = [item("MainHand", "T8_MAIN_SWORD@2")];
    expect(preferBuildItems(low, high)).toEqual(high);
  });
});

describe("canonicalizeBuildItems", () => {
  it("displays T8 Excellent of each family", () => {
    expect(
      canonicalizeBuildItems([item("MainHand", "T6_MAIN_SWORD@2", 1)])
    ).toEqual([{ slot: "MainHand", itemType: "T8_MAIN_SWORD", quality: 4 }]);
  });
});

describe("getMainHandItem", () => {
  it("returns the main-hand slot", () => {
    expect(
      getMainHandItem([
        item("Armor", "T8_ARMOR_CLOTH_SET1"),
        item("MainHand", "T8_2H_HOLYSTAFF"),
      ])?.itemType
    ).toBe("T8_2H_HOLYSTAFF");
  });
});

describe("extractBuildItemsFromKillItems", () => {
  it("matches participant payload equipment for the same role", () => {
    const payload: AlbionPlayerRef = {
      Equipment: {
        MainHand: { Type: "T8_MAIN_SWORD", Quality: 4, Count: 1 },
        Armor: { Type: "T8_ARMOR_PLATE_SET1", Quality: 3, Count: 1 },
        Shoes: { Type: "T8_SHOES_PLATE_SET1", Quality: 2, Count: 1 },
      },
    };
    const fromPayload = extractBuildItemsFromParticipantPayload(payload);
    const fromItems = extractBuildItemsFromKillItems(
      [
        {
          ownerRole: "killer",
          category: "equipment",
          slot: "MainHand",
          itemType: "T8_MAIN_SWORD",
          quality: 4,
        },
        {
          ownerRole: "killer",
          category: "equipment",
          slot: "Armor",
          itemType: "T8_ARMOR_PLATE_SET1",
          quality: 3,
        },
        {
          ownerRole: "killer",
          category: "inventory",
          slot: "slot_0",
          itemType: "T8_BAG",
          quality: 0,
        },
        {
          ownerRole: "victim",
          category: "equipment",
          slot: "MainHand",
          itemType: "T8_2H_BOW",
          quality: 1,
        },
        {
          ownerRole: "killer",
          category: "equipment",
          slot: "Shoes",
          itemType: "T8_SHOES_PLATE_SET1",
          quality: 2,
        },
      ],
      "killer"
    );

    expect(buildFingerprint(fromItems)).toBe(buildFingerprint(fromPayload));
    expect(fromItems).toEqual(fromPayload);
  });
});

describe("resolveBuildItems", () => {
  it("prefers kill_items over payload", () => {
    const items = resolveBuildItems(
      [
        {
          ownerRole: "killer",
          category: "equipment",
          slot: "MainHand",
          itemType: "T8_2H_HOLYSTAFF",
          quality: 4,
        },
      ],
      "killer",
      {
        Equipment: {
          MainHand: { Type: "T4_MAIN_SWORD", Quality: 1, Count: 1 },
        },
      }
    );
    expect(items).toEqual([
      { slot: "MainHand", itemType: "T8_2H_HOLYSTAFF", quality: 4 },
    ]);
  });

  it("falls back to payload when items are missing", () => {
    expect(
      resolveBuildItems([], "killer", {
        Equipment: {
          MainHand: { Type: "T8_MAIN_SWORD", Quality: 2, Count: 1 },
        },
      })
    ).toEqual([{ slot: "MainHand", itemType: "T8_MAIN_SWORD", quality: 2 }]);
  });
});
