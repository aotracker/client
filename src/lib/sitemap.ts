import type { MetadataRoute } from "next";
import {
  countSitemapAlliances,
  countSitemapBattles,
  countSitemapGuilds,
  countSitemapPlayers,
  listSitemapAlliances,
  listSitemapBattles,
  listSitemapGuilds,
  listSitemapPlayers,
  maxSitemapAlliancesUpdatedAt,
  maxSitemapBattlesUpdatedAt,
  maxSitemapGuildsUpdatedAt,
  maxSitemapPlayersUpdatedAt,
} from "@/lib/db/queries";
import { absoluteUrl, entityPath, type EntityType } from "@/lib/seo";
import { LOCALE_DEFINITIONS, withLocalePrefix } from "@/i18n/locales";
import {
  LEADERBOARD_TABS,
  leaderboardCanonicalPath,
} from "@/lib/leaderboards/params";

/** Google's per-file URL cap (sitemaps protocol). */
export const GOOGLE_MAX_URLS_PER_SITEMAP = 50_000;

/** Conservative entity page size so locale expansion stays under 50k URLs. */
export const ENTITIES_PER_SITEMAP = 20_000;

export const URLS_PER_SITEMAP = ENTITIES_PER_SITEMAP;

/** Kill details are noindex (crawl budget) and never listed here. */
const ENTITY_BUCKETS = [
  "players",
  "guilds",
  "alliances",
  "battles",
] as const;

export type SitemapBucket = "static" | (typeof ENTITY_BUCKETS)[number];

export interface SitemapSlice {
  id: string;
  bucket: SitemapBucket;
  page: number;
}

export interface SitemapIndexEntry {
  loc: string;
  lastModified?: Date | null;
}

function pageCount(total: number): number {
  if (total <= 0) return 0;
  return Math.ceil(total / ENTITIES_PER_SITEMAP);
}

export function emittedUrlCount(entityCount: number): number {
  return entityCount * LOCALE_DEFINITIONS.length;
}

function localizeUrls(
  path: string,
  extras: Omit<MetadataRoute.Sitemap[number], "url"> = {}
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
    });
  });
}

function mapNumericRows(
  type: "battle",
  rows: { entityId: number; region: string; updatedAt: Date | null }[]
): MetadataRoute.Sitemap {
  return rows.flatMap((row) => {
    const path = entityPath(type, row.region, row.entityId);
    return localizeUrls(path, {
      lastModified: row.updatedAt ?? undefined,
    });
  });
}

export function staticSitemapEntries(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/kills",
    "/battles",
    ...LEADERBOARD_TABS.map((tab) => leaderboardCanonicalPath(tab)),
    "/builds",
    "/discord",
  ];

  return paths.flatMap((path) => localizeUrls(path));
}

export function sitemapPartId(bucket: SitemapBucket, page = 0): string {
  if (bucket === "static") return "static";
  return `${bucket}-${page}`;
}

export function parseSitemapPartId(raw: string): SitemapSlice | null {
  const normalized = raw.replace(/\.xml$/i, "");
  if (normalized === "static") {
    return { id: "static", bucket: "static", page: 0 };
  }

  const match = /^(players|guilds|alliances|battles)-(\d+)$/.exec(
    normalized
  );
  if (!match) return null;
  return {
    id: normalized,
    bucket: match[1] as Exclude<SitemapBucket, "static">,
    page: Number.parseInt(match[2], 10),
  };
}

export async function buildSitemapSlices(): Promise<SitemapSlice[]> {
  const [players, guilds, alliances, battles] = await Promise.all([
    countSitemapPlayers(),
    countSitemapGuilds(),
    countSitemapAlliances(),
    countSitemapBattles(),
  ]);

  const slices: SitemapSlice[] = [
    { id: sitemapPartId("static"), bucket: "static", page: 0 },
  ];

  const totals: Record<Exclude<SitemapBucket, "static">, number> = {
    players,
    guilds,
    alliances,
    battles,
  };

  for (const bucket of ENTITY_BUCKETS) {
    const pages = pageCount(totals[bucket]);
    for (let page = 0; page < pages; page++) {
      slices.push({
        id: sitemapPartId(bucket, page),
        bucket,
        page,
      });
    }
  }

  return slices;
}

export async function getSitemapBucketLastmod(
  bucket: SitemapBucket
): Promise<Date | null> {
  switch (bucket) {
    case "static":
      return null;
    case "players":
      return maxSitemapPlayersUpdatedAt();
    case "guilds":
      return maxSitemapGuildsUpdatedAt();
    case "alliances":
      return maxSitemapAlliancesUpdatedAt();
    case "battles":
      return maxSitemapBattlesUpdatedAt();
    default:
      return null;
  }
}

export async function buildSitemapIndexEntries(): Promise<SitemapIndexEntry[]> {
  const slices = await buildSitemapSlices();
  const lastmodByBucket = new Map<SitemapBucket, Date | null>();
  await Promise.all(
    [...new Set(slices.map((slice) => slice.bucket))].map(async (bucket) => {
      lastmodByBucket.set(bucket, await getSitemapBucketLastmod(bucket));
    })
  );

  return slices.map((slice) => ({
    loc: absoluteUrl(sitemapPartPath(slice.id)),
    lastModified: lastmodByBucket.get(slice.bucket) ?? null,
  }));
}

export async function getSitemapEntriesForSlice(
  slice: SitemapSlice
): Promise<MetadataRoute.Sitemap> {
  if (slice.bucket === "static") {
    return staticSitemapEntries();
  }

  const offset = slice.page * ENTITIES_PER_SITEMAP;
  const limit = ENTITIES_PER_SITEMAP;

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

function toLastMod(value: string | Date | undefined | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function renderUrlSetXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const lastmod = toLastMod(entry.lastModified);
      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>${
        lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
      }
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function renderSitemapIndexXml(entries: SitemapIndexEntry[]): string {
  const items = entries
    .map((entry) => {
      const lastmod = toLastMod(entry.lastModified);
      return `  <sitemap>
    <loc>${escapeXml(entry.loc)}</loc>${
        lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
      }
  </sitemap>`;
    })
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

/** Root-hosted child sitemap path (Search Console + directory-scope safe). */
export function sitemapPartPath(id: string): string {
  return `/sitemap-${id}.xml`;
}
