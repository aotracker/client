import { describe, expect, it } from "vitest";
import { lookbackUtcDate } from "./shared";

describe("lookbackUtcDate", () => {
  const now = new Date("2026-08-28T15:00:00.000Z");

  it("returns the UTC date days ago", () => {
    expect(lookbackUtcDate(7, now)).toBe("2026-08-21");
    expect(lookbackUtcDate(1, now)).toBe("2026-08-27");
  });

  it("clamps to 1–30 days", () => {
    expect(lookbackUtcDate(0, now)).toBe(lookbackUtcDate(7, now));
    expect(lookbackUtcDate(90, now)).toBe("2026-07-29");
  });
});
