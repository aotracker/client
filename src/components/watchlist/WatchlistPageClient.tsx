"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/PageSection";
import { WatchlistPageContent } from "@/components/watchlist/WatchlistPageContent";
import { WatchlistSignInBanner } from "@/components/watchlist/WatchlistSignInBanner";
import { useWatchlist } from "@/components/watchlist/useWatchlist";
import { KillCardSkeleton } from "@/components/ui/skeleton";

export function WatchlistPageClient() {
  const t = useTranslations("Watchlist");
  const { signedIn, ready } = useWatchlist();

  const description =
    ready && signedIn ? t("descriptionSynced") : t("description");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={description} />
      <WatchlistSignInBanner />
      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <KillCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <WatchlistPageContent />
      </Suspense>
    </div>
  );
}
