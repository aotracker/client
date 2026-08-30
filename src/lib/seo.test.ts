import { describe, expect, it } from "vitest";
import {
  buildPageMetadata,
  languageAlternates,
  NOINDEX_FOLLOW,
  openGraphImagePath,
} from "./seo";

describe("openGraphImagePath", () => {
  it("appends /opengraph-image to a path", () => {
    expect(openGraphImagePath("/leaderboards")).toBe(
      "/leaderboards/opengraph-image"
    );
  });

  it("strips query strings so tab canonicals still hit the page image", () => {
    expect(openGraphImagePath("/leaderboards?tab=guilds")).toBe(
      "/leaderboards/opengraph-image"
    );
    expect(openGraphImagePath("/es/leaderboards?tab=fame")).toBe(
      "/es/leaderboards/opengraph-image"
    );
  });
});

describe("languageAlternates", () => {
  it("returns absolute en, es, and x-default URLs", () => {
    const alternates = languageAlternates("/player/americas/Name");
    expect(alternates.en).toMatch(/\/player\/americas\/Name$/);
    expect(alternates.es).toMatch(/\/es\/player\/americas\/Name$/);
    expect(alternates["x-default"]).toBe(alternates.en);
    expect(alternates.en).toMatch(/^https?:\/\//);
  });
});

describe("buildPageMetadata", () => {
  it("self-canonicalizes the English URL and keeps a bidirectional hreflang set", () => {
    const metadata = buildPageMetadata({
      title: "Player",
      description: "Desc",
      canonicalPath: "/player/americas/Name",
      locale: "en",
    });

    expect(metadata.alternates?.canonical).toMatch(/\/player\/americas\/Name$/);
    expect(metadata.alternates?.languages).toEqual(
      languageAlternates("/player/americas/Name")
    );
    expect(metadata.openGraph?.locale).toBe("en_US");
    expect(metadata.openGraph?.alternateLocale).toEqual(["es_ES"]);
  });

  it("self-canonicalizes Spanish URLs instead of pointing at English", () => {
    const metadata = buildPageMetadata({
      title: "Jugador",
      description: "Desc",
      canonicalPath: "/player/americas/Name",
      locale: "es",
    });

    expect(metadata.alternates?.canonical).toMatch(
      /\/es\/player\/americas\/Name$/
    );
    expect(metadata.alternates?.languages).toEqual(
      languageAlternates("/player/americas/Name")
    );
    expect(metadata.openGraph?.locale).toBe("es_ES");
    expect(metadata.openGraph?.alternateLocale).toEqual(["en_US"]);
  });

  it("supports noindex follow for high-cardinality pages", () => {
    const metadata = buildPageMetadata({
      title: "Kill",
      description: "Desc",
      canonicalPath: "/kill/americas/1",
      robots: NOINDEX_FOLLOW,
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
