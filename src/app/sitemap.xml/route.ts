import { absoluteUrl } from "@/lib/seo";
import {
  buildSitemapSlices,
  renderSitemapIndexXml,
  sitemapPartPath,
  sitemapXmlResponse,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/** Sitemap index at /sitemap.xml (Next generateSitemaps does not serve this path). */
export async function GET() {
  try {
    const slices = await buildSitemapSlices();
    const locs = slices.map((slice) => absoluteUrl(sitemapPartPath(slice.id)));
    return sitemapXmlResponse(renderSitemapIndexXml(locs));
  } catch (err) {
    console.error("[sitemap] Failed to build index, falling back to static:", err);
    // Still advertise a usable index if DB counts fail.
    return sitemapXmlResponse(
      renderSitemapIndexXml([absoluteUrl(sitemapPartPath(0))])
    );
  }
}
