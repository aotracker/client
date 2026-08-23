import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WatchlistPageClient } from "@/components/watchlist/WatchlistPageClient";
import { buildPageMetadata } from "@/lib/seo";

interface WatchlistPageProps {
  params: Promise<{ locale: string }>;
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

export default async function WatchlistPage({ params }: WatchlistPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WatchlistPageClient />;
}
