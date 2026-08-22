import {
  buildSitemapSlices,
  getSitemapEntriesForSlice,
  parseSitemapPartId,
  renderUrlSetXml,
  staticSitemapEntries,
  sitemapXmlResponse,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params;
  const requested = parseSitemapPartId(rawId);
  if (!requested) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const slices = await buildSitemapSlices();
    const slice = slices.find((s) => s.id === requested.id);
    if (!slice) {
      return new Response("Not Found", { status: 404 });
    }

    const entries = await getSitemapEntriesForSlice(slice);
    return sitemapXmlResponse(renderUrlSetXml(entries));
  } catch (err) {
    console.error(`[sitemap] Failed to build part ${requested.id}:`, err);
    if (requested.id === "static") {
      return sitemapXmlResponse(renderUrlSetXml(staticSitemapEntries()));
    }
    return new Response("Sitemap temporarily unavailable", { status: 503 });
  }
}
