import type { MetadataRoute } from "next";
import {
  countSitemapAlliances,
  countSitemapBattles,
  countSitemapGuilds,
  countSitemapKills,
  countSitemapPlayers,
  listSitemapAlliances,
  listSitemapBattles,
  listSitemapGuilds,
  listSitemapKills,
  listSitemapPlayers,
} from "@/lib/db/queries";
import { absoluteUrl, entityPath, type EntityType } from "@/lib/seo";
import { LOCALE_DEFINITIONS, withLocalePrefix } from "@/i18n/locales";

export const URLS_PER_SITEMAP = 10_000;

export type SitemapBucket =
  | "static"
  | "players"
  | "guilds"
  | "alliances"
  | "kills"
  | "battles";

export interface SitemapSlice {
  id: number;
  bucket: SitemapBucket;
  page: number;
}

function pageCount(total: number): number {
  if (total <= 0) return 0;
  return Math.ceil(total / URLS_PER_SITEMAP);
}

function localizeUrls(
  path: string,
  extras: Omit<MetadataRoute.Sitemap[number], "url">
): MetadataRoute.Sitemap {
  return LOCALE_DEFINITIONS.map((def) => ({
    url: absoluteUrl(withLocalePrefix(def.code, path)),
    ...extras,
  }));
}

function mapEntityRows(
  type: EntityType,
  rows: { name: string; albionId: string; region: string; updatedAt: Date | null }[]
): MetadataRoute.Sitemap {
  return rows.flatMap((row) => {
    const path = entityPath(
      type,
      row.region,
      type === "player" || type === "guild" ? row.name : row.albionId
    );
    return localizeUrls(path, {
      lastModified: row.updatedAt ?? undefined,
      changeFrequency: "daily" as const,
      priority: type === "player" || type === "guild" ? 0.8 : 0.7,
    });
  });
}

function mapNumericRows(
  type: "kill" | "battle",
  rows: { entityId: number; region: string; updatedAt: Date | null }[]
): MetadataRoute.Sitemap {
  return rows.flatMap((row) => {
    const path = entityPath(type, row.region, row.entityId);
    return localizeUrls(path, {
      lastModified: row.updatedAt ?? undefined,
      changeFrequency: type === "kill" ? ("hourly" as const) : ("daily" as const),
      priority: type === "battle" ? 0.75 : 0.65,
    });
  });
}

export function staticSitemapEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths: { path: string; changeFrequency: "hourly" | "daily"; priority: number }[] = [
    { path: "/", changeFrequency: "hourly", priority: 1 },
    { path: "/kills", changeFrequency: "hourly", priority: 0.95 },
    { path: "/battles", changeFrequency: "hourly", priority: 0.9 },
    { path: "/leaderboards", changeFrequency: "hourly", priority: 0.9 },
    { path: "/builds", changeFrequency: "daily", priority: 0.8 },
    { path: "/watchlist", changeFrequency: "daily", priority: 0.6 },
    { path: "/discord", changeFrequency: "daily", priority: 0.5 },
    { path: "/privacy", changeFrequency: "daily", priority: 0.3 },
  ];

  return paths.flatMap(({ path, changeFrequency, priority }) =>
    localizeUrls(path, {
      lastModified: now,
      changeFrequency,
      priority,
    })
  );
}

export async function buildSitemapSlices(): Promise<SitemapSlice[]> {
  const [players, guilds, alliances, kills, battles] = await Promise.all([
    countSitemapPlayers(),
    countSitemapGuilds(),
    countSitemapAlliances(),
    countSitemapKills(),
    countSitemapBattles(),
  ]);

  const slices: SitemapSlice[] = [{ id: 0, bucket: "static", page: 0 }];
  let nextId = 1;

  const buckets: {
    bucket: Exclude<SitemapBucket, "static">;
    total: number;
  }[] = [
    { bucket: "players", total: players },
    { bucket: "guilds", total: guilds },
    { bucket: "alliances", total: alliances },
    { bucket: "kills", total: kills },
    { bucket: "battles", total: battles },
  ];

  for (const { bucket, total } of buckets) {
    const pages = pageCount(total);
    for (let page = 0; page < pages; page++) {
      slices.push({ id: nextId, bucket, page });
      nextId += 1;
    }
  }

  return slices;
}

export async function getSitemapEntriesForSlice(
  slice: SitemapSlice
): Promise<MetadataRoute.Sitemap> {
  if (slice.bucket === "static") {
    return staticSitemapEntries();
  }

  const offset = slice.page * URLS_PER_SITEMAP;
  const limit = URLS_PER_SITEMAP;

  switch (slice.bucket) {
    case "players":
      return mapEntityRows("player", await listSitemapPlayers(offset, limit));
    case "guilds":
      return mapEntityRows("guild", await listSitemapGuilds(offset, limit));
    case "alliances":
      return mapEntityRows(
        "alliance",
        await listSitemapAlliances(offset, limit)
      );
    case "kills":
      return mapNumericRows("kill", await listSitemapKills(offset, limit));
    case "battles":
      return mapNumericRows("battle", await listSitemapBattles(offset, limit));
    default:
      return [];
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLastMod(value: string | Date | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function renderUrlSetXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const lastmod = toLastMod(entry.lastModified);
      const changefreq = entry.changeFrequency
        ? `\n    <changefreq>${entry.changeFrequency}</changefreq>`
        : "";
      const priority =
        entry.priority != null
          ? `\n    <priority>${entry.priority}</priority>`
          : "";
      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>${
        lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
      }${changefreq}${priority}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function renderSitemapIndexXml(locs: string[]): string {
  const items = locs
    .map(
      (loc) => `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
  </sitemap>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
}

export function sitemapXmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

/** Child sitemap path used in the index (stable, Search Console friendly). */
export function sitemapPartPath(id: number): string {
  return `/sitemaps/${id}`;
}
