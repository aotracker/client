import { describe, expect, it } from "vitest";
import { parseUserAgentDevice } from "./user-agent";

const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const EDGE_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
const FIREFOX_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";

describe("parseUserAgentDevice", () => {
  it("returns null for empty values", () => {
    expect(parseUserAgentDevice(null)).toBeNull();
    expect(parseUserAgentDevice("  ")).toBeNull();
  });

  it("parses Chrome on Windows", () => {
    expect(parseUserAgentDevice(CHROME_WINDOWS)).toEqual({
      browser: "Chrome",
      os: "Windows",
    });
  });

  it("does not call Edge Chrome", () => {
    expect(parseUserAgentDevice(EDGE_WINDOWS)).toEqual({
      browser: "Edge",
      os: "Windows",
    });
  });

  it("parses Firefox on macOS", () => {
    expect(parseUserAgentDevice(FIREFOX_MAC)).toEqual({
      browser: "Firefox",
      os: "macOS",
    });
  });

  it("parses Safari on iOS", () => {
    expect(parseUserAgentDevice(SAFARI_IOS)).toEqual({
      browser: "Safari",
      os: "iOS",
    });
  });

  it("still detects Windows when Chrome is missing from a truncated UA", () => {
    expect(
      parseUserAgentDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      )
    ).toEqual({
      browser: null,
      os: "Windows",
    });
  });
});
