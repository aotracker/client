import type { MetadataRoute } from "next";
import { LOCALE_DEFINITIONS, withLocalePrefix } from "@/i18n/locales";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";

/** Trailing slash so `/kills` (the feed) stays crawlable. */
const KILL_DETAIL_DISALLOW = LOCALE_DEFINITIONS.map((def) =>
  withLocalePrefix(def.code, "/kill/")
);

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "AhrefsBot",
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/status",
          "/health",
          "/privacy",
          "/terms",
          ...KILL_DETAIL_DISALLOW,
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
