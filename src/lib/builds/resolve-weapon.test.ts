import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveMetaWeapon } from "./resolve-weapon";

describe("resolveMetaWeapon", () => {
  it("returns null when missing or unknown", () => {
    expect(resolveMetaWeapon(undefined)).toBeNull();
    expect(resolveMetaWeapon("")).toBeNull();
    expect(resolveMetaWeapon("not-a-real-weapon")).toBeNull();
  });

  it("maps friendly names used in the URL", () => {
    expect(resolveMetaWeapon("Hallowfall")).toBe("MAIN_HOLYSTAFF_AVALON");
    expect(resolveMetaWeapon("Heavy Mace")).toBe("2H_MACE");
    expect(resolveMetaWeapon("Longbow")).toBe("2H_LONGBOW");
  });

  it("matches slugs and plus-encoded spaces", () => {
    expect(resolveMetaWeapon("hallowfall")).toBe("MAIN_HOLYSTAFF_AVALON");
    expect(resolveMetaWeapon("heavy-mace")).toBe("2H_MACE");
    expect(resolveMetaWeapon("Heavy+Mace")).toBe("2H_MACE");
  });

  it("still accepts Albion family keys", () => {
    expect(resolveMetaWeapon("T8_2H_HOLYSTAFF@3")).toBe("2H_HOLYSTAFF");
    expect(resolveMetaWeapon("2H_HOLYSTAFF")).toBe("2H_HOLYSTAFF");
    expect(resolveMetaWeapon("MAIN_HOLYSTAFF_AVALON")).toBe(
      "MAIN_HOLYSTAFF_AVALON"
    );
  });
});
