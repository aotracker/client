import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageSection";
import { WatchlistPageContent } from "@/components/watchlist/WatchlistPageContent";
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
  const t = await getTranslations("Watchlist");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <WatchlistPageContent />
    </div>
  );
}
