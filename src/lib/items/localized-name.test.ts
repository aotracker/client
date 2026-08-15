import { describe, expect, it } from "vitest";
import { pickLocalizedName } from "./localized-name";

describe("pickLocalizedName", () => {
  it("prefers the active locale, then English, then fallback", () => {
    expect(pickLocalizedName({ en: "Sword", es: "Espada" }, "es", "X")).toBe(
      "Espada"
    );
    expect(pickLocalizedName({ en: "Sword" }, "es", "X")).toBe("Sword");
    expect(pickLocalizedName(undefined, "en", "Fallback")).toBe("Fallback");
  });
});
