import {
  buildSitemapIndexEntries,
  renderSitemapIndexXml,
  sitemapPartPath,
  sitemapXmlResponse,
} from "@/lib/sitemap";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Sitemap index at /sitemap.xml (Next generateSitemaps does not serve this path). */
export async function GET() {
  try {
    const entries = await buildSitemapIndexEntries();
    return sitemapXmlResponse(renderSitemapIndexXml(entries));
  } catch (err) {
    console.error("[sitemap] Failed to build index, falling back to static:", err);
    return sitemapXmlResponse(
      renderSitemapIndexXml([
        { loc: absoluteUrl(sitemapPartPath("static")) },
      ])
    );
  }
}
