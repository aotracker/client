import { describe, expect, it } from "vitest";
import { weaponFilterParam, weaponNameSlug } from "./weapon-slug";

describe("weaponNameSlug", () => {
  it("slugifies friendly weapon names", () => {
    expect(weaponNameSlug("Hallowfall")).toBe("hallowfall");
    expect(weaponNameSlug("Heavy Mace")).toBe("heavy-mace");
    expect(weaponNameSlug("Longbow")).toBe("longbow");
  });

  it("is stable across spacing and case", () => {
    expect(weaponNameSlug("heavy mace")).toBe("heavy-mace");
    expect(weaponNameSlug("  Heavy   Mace ")).toBe("heavy-mace");
  });
});

describe("weaponFilterParam", () => {
  it("prefers the English catalog name", () => {
    expect(
      weaponFilterParam(
        { en: "Hallowfall", es: "Hallowfall" },
        "MAIN_HOLYSTAFF_AVALON"
      )
    ).toBe("Hallowfall");
  });

  it("falls back to the family key", () => {
    expect(weaponFilterParam(undefined, "2H_LONGBOW")).toBe("2H_LONGBOW");
  });
});
