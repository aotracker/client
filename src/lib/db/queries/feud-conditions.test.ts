import { describe, expect, it } from "vitest";
import {
  allianceFeudPairCondition,
  guildFeudPairCondition,
  normalizeGuildFeudInput,
} from "./feud-conditions";

describe("normalizeGuildFeudInput", () => {
  it("returns null for empty or identical guild names", () => {
    expect(normalizeGuildFeudInput({ guildNameA: "", guildNameB: "B" })).toBeNull();
    expect(
      normalizeGuildFeudInput({ guildNameA: "Same", guildNameB: "same" })
    ).toBeNull();
  });

  it("normalizes names and trims ids", () => {
    expect(
      normalizeGuildFeudInput({
        guildNameA: " Alpha ",
        guildNameB: "Beta",
        guildAId: " id-a ",
        guildBId: "id-b",
      })
    ).toEqual({
      nameA: "alpha",
      nameB: "beta",
      idA: "id-a",
      idB: "id-b",
    });
  });
});

describe("guildFeudPairCondition", () => {
  it("returns null when guild pair is invalid", () => {
    expect(guildFeudPairCondition({ guildNameA: "A", guildNameB: "A" })).toBeNull();
  });

  it("returns SQL for valid name-only pair", () => {
    expect(
      guildFeudPairCondition({ guildNameA: "Guild A", guildNameB: "Guild B" })
    ).toBeTruthy();
  });

  it("returns SQL for valid id pair", () => {
    expect(
      guildFeudPairCondition({
        guildNameA: "Guild A",
        guildNameB: "Guild B",
        guildAId: "ga",
        guildBId: "gb",
      })
    ).toBeTruthy();
  });
});

describe("allianceFeudPairCondition", () => {
  it("returns null for identical alliance ids", () => {
    expect(allianceFeudPairCondition("x", "x")).toBeNull();
  });

  it("returns SQL for distinct alliance ids", () => {
    expect(allianceFeudPairCondition("a1", "a2")).toBeTruthy();
  });
});
