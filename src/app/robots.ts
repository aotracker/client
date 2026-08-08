import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/status", "/health", "/privacy"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
