import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/queries", () => ({
  countSitemapPlayers: async () => 0,
  countSitemapGuilds: async () => 0,
  countSitemapAlliances: async () => 0,
  countSitemapBattles: async () => 0,
  listSitemapPlayers: async () => [],
  listSitemapGuilds: async () => [],
  listSitemapAlliances: async () => [],
  listSitemapBattles: async () => [],
  maxSitemapPlayersUpdatedAt: async () => null,
  maxSitemapGuildsUpdatedAt: async () => null,
  maxSitemapAlliancesUpdatedAt: async () => null,
  maxSitemapBattlesUpdatedAt: async () => null,
}));

import { LOCALE_DEFINITIONS } from "@/i18n/locales";
import {
  ENTITIES_PER_SITEMAP,
  GOOGLE_MAX_URLS_PER_SITEMAP,
  emittedUrlCount,
  parseSitemapPartId,
  renderSitemapIndexXml,
  renderUrlSetXml,
  sitemapPartPath,
  staticSitemapEntries,
} from "./sitemap";

describe("staticSitemapEntries", () => {
  const urls = staticSitemapEntries().map((entry) => entry.url);

  it("includes high-value pages in every locale", () => {
    expect(urls.some((url) => url.endsWith("/") || /\/\/[^/]+$/.test(url))).toBe(
      true
    );
    expect(urls.some((url) => url.includes("/kills"))).toBe(true);
    expect(urls.some((url) => url.includes("/discord"))).toBe(true);
    expect(urls.some((url) => url.includes("/es/kills"))).toBe(true);
    expect(urls.some((url) => url.includes("/es/discord"))).toBe(true);
  });

  it("omits noindex and utility pages", () => {
    expect(urls.some((url) => url.includes("/privacy"))).toBe(false);
    expect(urls.some((url) => url.includes("/terms"))).toBe(false);
    expect(urls.some((url) => url.includes("/watchlist"))).toBe(false);
    expect(urls.some((url) => url.includes("/contact"))).toBe(false);
    expect(urls.some((url) => url.includes("/search"))).toBe(false);
  });

  it("lists the kills feed but not individual kill details", () => {
    expect(urls.some((url) => /\/kills(?:\/|$|\?)/.test(url))).toBe(true);
    expect(urls.some((url) => /\/kill\//.test(url))).toBe(false);
  });

  it("omits lastModified on static URLs", () => {
    expect(
      staticSitemapEntries().every((entry) => entry.lastModified == null)
    ).toBe(true);
  });
});

describe("renderUrlSetXml", () => {
  it("emits loc and lastmod without ignored tags", () => {
    const xml = renderUrlSetXml([
      {
        url: "https://www.aotracker.net/player/americas/Name",
        lastModified: new Date("2026-08-01T12:00:00.000Z"),
      },
    ]);

    expect(xml).toContain(
      "<loc>https://www.aotracker.net/player/americas/Name</loc>"
    );
    expect(xml).toContain("<lastmod>2026-08-01T12:00:00.000Z</lastmod>");
    expect(xml).not.toContain("<changefreq>");
    expect(xml).not.toContain("<priority>");
  });
});

describe("sitemap part paths", () => {
  it("uses root-hosted stable names", () => {
    expect(sitemapPartPath("static")).toBe("/sitemap-static.xml");
    expect(sitemapPartPath("players-0")).toBe("/sitemap-players-0.xml");
    expect(parseSitemapPartId("players-0")).toEqual({
      id: "players-0",
      bucket: "players",
      page: 0,
    });
    expect(parseSitemapPartId("static.xml")).toEqual({
      id: "static",
      bucket: "static",
      page: 0,
    });
    expect(parseSitemapPartId("kills-0")).toBeNull();
    expect(parseSitemapPartId("kills-0.xml")).toBeNull();
  });

  it("keeps entity x locale expansion under Google's URL cap", () => {
    expect(emittedUrlCount(ENTITIES_PER_SITEMAP)).toBeLessThanOrEqual(
      GOOGLE_MAX_URLS_PER_SITEMAP
    );
    expect(LOCALE_DEFINITIONS.length).toBeGreaterThan(0);
  });
});

describe("renderSitemapIndexXml", () => {
  it("lists root child sitemaps with optional lastmod", () => {
    const xml = renderSitemapIndexXml([
      { loc: "https://www.aotracker.net/sitemap-static.xml" },
      {
        loc: "https://www.aotracker.net/sitemap-players-0.xml",
        lastModified: new Date("2026-08-01T00:00:00.000Z"),
      },
    ]);

    expect(xml).toContain(
      "<loc>https://www.aotracker.net/sitemap-static.xml</loc>"
    );
    expect(xml).toContain(
      "<loc>https://www.aotracker.net/sitemap-players-0.xml</loc>"
    );
    expect(xml).toContain("<lastmod>2026-08-01T00:00:00.000Z</lastmod>");
  });
});
