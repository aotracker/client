import { describe, expect, it } from "vitest";
import {
  COOKIE_CONSENT_VERSION,
  parseCookieConsent,
} from "./cookie-consent";

describe("parseCookieConsent", () => {
  it("returns null for missing or invalid JSON", () => {
    expect(parseCookieConsent(null)).toBeNull();
    expect(parseCookieConsent("")).toBeNull();
    expect(parseCookieConsent("not-json")).toBeNull();
    expect(parseCookieConsent("[]")).toBeNull();
    expect(parseCookieConsent("{}")).toBeNull();
  });

  it("accepts a current-version record", () => {
    expect(
      parseCookieConsent(
        JSON.stringify({
          version: COOKIE_CONSENT_VERSION,
          analytics: true,
          updatedAt: 1_700_000_000_000,
        })
      )
    ).toEqual({
      version: COOKIE_CONSENT_VERSION,
      analytics: true,
      updatedAt: 1_700_000_000_000,
    });
    expect(
      parseCookieConsent(
        JSON.stringify({
          version: COOKIE_CONSENT_VERSION,
          analytics: false,
          updatedAt: 1,
        })
      )?.analytics
    ).toBe(false);
  });

  it("rejects stale versions and malformed fields", () => {
    expect(
      parseCookieConsent(
        JSON.stringify({
          version: COOKIE_CONSENT_VERSION + 1,
          analytics: true,
          updatedAt: 1,
        })
      )
    ).toBeNull();
    expect(
      parseCookieConsent(
        JSON.stringify({
          version: COOKIE_CONSENT_VERSION,
          analytics: "yes",
          updatedAt: 1,
        })
      )
    ).toBeNull();
    expect(
      parseCookieConsent(
        JSON.stringify({
          version: COOKIE_CONSENT_VERSION,
          analytics: true,
          updatedAt: Number.NaN,
        })
      )
    ).toBeNull();
  });
});
