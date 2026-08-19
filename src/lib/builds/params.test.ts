import { describe, expect, it } from "vitest";
import {
  parseBuildDays,
  parseMetaBuildArmor,
  parseMetaBuildRole,
  parseMetaBuildSort,
  parseMetaWeapon,
} from "./params";

describe("parseBuildDays", () => {
  it("accepts the discrete window chips", () => {
    expect(parseBuildDays("1")).toBe(1);
    expect(parseBuildDays("7")).toBe(7);
    expect(parseBuildDays("14")).toBe(14);
    expect(parseBuildDays("30")).toBe(30);
  });

  it("defaults to 30 for missing or invalid values", () => {
    expect(parseBuildDays(undefined)).toBe(30);
    expect(parseBuildDays("15")).toBe(30);
    expect(parseBuildDays("0")).toBe(30);
  });
});

describe("parseMetaBuildSort", () => {
  it("defaults to usage", () => {
    expect(parseMetaBuildSort(undefined)).toBe("usage");
    expect(parseMetaBuildSort("nope")).toBe("usage");
  });

  it("accepts ranking keys", () => {
    expect(parseMetaBuildSort("kd")).toBe("kd");
    expect(parseMetaBuildSort("kills")).toBe("kills");
    expect(parseMetaBuildSort("fame")).toBe("fame");
  });
});

describe("parseMetaBuildRole", () => {
  it("defaults to all", () => {
    expect(parseMetaBuildRole(undefined)).toBe("all");
    expect(parseMetaBuildRole("mage")).toBe("all");
  });

  it("accepts combat roles", () => {
    expect(parseMetaBuildRole("healer")).toBe("healer");
    expect(parseMetaBuildRole("dps")).toBe("dps");
  });
});

describe("parseMetaBuildArmor", () => {
  it("defaults to all", () => {
    expect(parseMetaBuildArmor("mail")).toBe("all");
  });

  it("accepts armor classes", () => {
    expect(parseMetaBuildArmor("plate")).toBe("plate");
  });
});

describe("parseMetaWeapon", () => {
  it("returns null when missing or invalid", () => {
    expect(parseMetaWeapon(undefined)).toBeNull();
    expect(parseMetaWeapon("")).toBeNull();
    expect(parseMetaWeapon("??")).toBeNull();
  });

  it("accepts friendly names for the URL chip", () => {
    expect(parseMetaWeapon("Hallowfall")).toBe("Hallowfall");
    expect(parseMetaWeapon("Heavy Mace")).toBe("Heavy Mace");
    expect(parseMetaWeapon("heavy-mace")).toBe("heavy-mace");
  });

  it("collapses tiered item types to a family key", () => {
    expect(parseMetaWeapon("T8_2H_HOLYSTAFF@3")).toBe("2H_HOLYSTAFF");
    expect(parseMetaWeapon("2H_HOLYSTAFF")).toBe("2H_HOLYSTAFF");
  });
});
