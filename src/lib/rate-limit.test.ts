import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "./rate-limit";

describe("consumeRateLimit", () => {
  it("allows up to the limit then blocks in the same window", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    expect(consumeRateLimit(key, 2, 60_000)).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000)).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000)).toBe(false);
  });
});
