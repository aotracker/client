import { describe, expect, it } from "vitest";
import {
  JUICY_MIN_SILVER,
  parseJuicyFlag,
  parseMinFame,
  parseWatchlistFlag,
} from "./kills-feed-params";

describe("parseJuicyFlag", () => {
  it("treats 1 and true as on", () => {
    expect(parseJuicyFlag("1")).toBe(true);
    expect(parseJuicyFlag("true")).toBe(true);
    expect(parseJuicyFlag(true)).toBe(true);
  });

  it("treats missing or other values as off", () => {
    expect(parseJuicyFlag(undefined)).toBe(false);
    expect(parseJuicyFlag("0")).toBe(false);
    expect(parseJuicyFlag("false")).toBe(false);
    expect(parseJuicyFlag(false)).toBe(false);
  });
});

describe("juicy threshold", () => {
  it("is 20 million silver", () => {
    expect(JUICY_MIN_SILVER).toBe(20_000_000);
  });
});

describe("parseMinFame", () => {
  it("returns 0 when missing or invalid", () => {
    expect(parseMinFame(undefined)).toBe(0);
    expect(parseMinFame("nope")).toBe(0);
  });
});

describe("parseWatchlistFlag", () => {
  it("matches the juicy flag for query strings", () => {
    expect(parseWatchlistFlag("1")).toBe(parseJuicyFlag("1"));
    expect(parseWatchlistFlag(undefined)).toBe(parseJuicyFlag(undefined));
  });
});
