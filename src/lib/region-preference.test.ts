import { describe, expect, it } from "vitest";
import { isPreferredRegion } from "./region-preference";

describe("isPreferredRegion", () => {
  it("accepts all and enabled region slugs", () => {
    expect(isPreferredRegion("all")).toBe(true);
    expect(isPreferredRegion("americas")).toBe(true);
    expect(isPreferredRegion("not-a-region")).toBe(false);
  });
});
