import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WatchlistPageClient } from "@/components/watchlist/WatchlistPageClient";
import { getSession } from "@/lib/auth";
import { parseJuicyFlag } from "@/lib/kills-feed-params";
import { getWatchlistPageSeed } from "@/lib/watchlist-page-data";
import { buildPageMetadata } from "@/lib/seo";

interface WatchlistPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ juicy?: string }>;
}

export async function generateMetadata({
  params,
}: WatchlistPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Watchlist" });

  return buildPageMetadata({
    title: t("title"),
    description: t("metaDescription"),
    canonicalPath: "/watchlist",
    locale,
  });
}

export default async function WatchlistPage({
  params,
  searchParams,
}: WatchlistPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const search = await searchParams;
  const juicy = parseJuicyFlag(search.juicy);

  const session = await getSession().catch(() => null);
  const seed = session?.user
    ? await getWatchlistPageSeed(session.user.id, juicy).catch(() => null)
    : null;

  return (
    <WatchlistPageClient
      initialEntries={seed?.entries}
      initialActivity={seed?.activity}
      initialLiveIds={seed?.liveIds}
      initialLiveGuildIds={seed?.liveGuildIds}
    />
  );
}
