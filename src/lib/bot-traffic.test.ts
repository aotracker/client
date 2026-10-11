import { describe, expect, it } from "vitest";
import { isLikelyKillUrlScraper } from "./bot-traffic";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("isLikelyKillUrlScraper", () => {
  it("returns false for social crawlers", () => {
    expect(
      isLikelyKillUrlScraper(
        headers({ "user-agent": "Discordbot/2.0 (+https://discord.com)" })
      )
    ).toBe(false);
  });

  it("returns false when sec-fetch-user indicates a user gesture", () => {
    expect(
      isLikelyKillUrlScraper(
        headers({
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/145.0.0.0",
          "sec-fetch-user": "?1",
          accept: "*/*",
        })
      )
    ).toBe(false);
  });

  it("returns true for spoofed Chrome with weak accept and no session", () => {
    expect(
      isLikelyKillUrlScraper(
        headers({
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/145.0.0.0 Safari/537.36",
          accept: "*/*",
          "sec-fetch-site": "none",
        })
      )
    ).toBe(true);
  });
});
