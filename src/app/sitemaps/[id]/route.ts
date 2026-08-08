import {
  buildSitemapSlices,
  getSitemapEntriesForSlice,
  renderUrlSetXml,
  staticSitemapEntries,
  sitemapXmlResponse,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";

function parseSitemapId(raw: string): number | null {
  const normalized = raw.replace(/\.xml$/i, "");
  const id = Number.parseInt(normalized, 10);
  if (!Number.isFinite(id) || id < 0) return null;
  return id;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params;
  const id = parseSitemapId(rawId);
  if (id == null) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const slices = await buildSitemapSlices();
    const slice = slices.find((s) => s.id === id);
    if (!slice) {
      return new Response("Not Found", { status: 404 });
    }

    const entries = await getSitemapEntriesForSlice(slice);
    return sitemapXmlResponse(renderUrlSetXml(entries));
  } catch (err) {
    console.error(`[sitemap] Failed to build part ${id}:`, err);
    if (id === 0) {
      return sitemapXmlResponse(renderUrlSetXml(staticSitemapEntries()));
    }
    return new Response("Sitemap temporarily unavailable", { status: 503 });
  }
}
