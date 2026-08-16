"use client";

import { useTranslations } from "next-intl";
import { PageSection } from "@/components/PageSection";
import { KillCardSkeleton, Skeleton } from "@/components/ui/skeleton";

const HOME_RECENT_LIMIT = 10;
const HOME_JUICY_LIMIT = 10;
const HOME_KILLERS_LIMIT = 10;
const HOME_FAME_LIMIT = 10;

export function JuicyKillsFallback() {
  const t = useTranslations("Home");
  const tCommon = useTranslations("Common");

  return (
    <PageSection
      title={t("sections.juicyKillsTitle")}
      description={t("sections.juicyKillsDescription")}
    >
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label={tCommon("a11y.loadingJuicyKills")}
      >
        {Array.from({ length: HOME_JUICY_LIMIT }).map((_, i) => (
          <KillCardSkeleton key={i} compactSize="default" />
        ))}
      </div>
    </PageSection>
  );
}

export function TopKillersFallback() {
  const t = useTranslations("Home");
  const tCommon = useTranslations("Common");

  return (
    <PageSection
      title={t("sections.topKillersTitle")}
      description={t("sections.topKillersDescription")}
    >
      <div
        className="grid grid-cols-1 gap-2.5"
        aria-busy="true"
        aria-label={tCommon("a11y.loadingTopKillers")}
      >
        {Array.from({ length: HOME_KILLERS_LIMIT }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3"
          >
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    </PageSection>
  );
}

export function TopFameEarnersFallback() {
  const t = useTranslations("Home");
  const tCommon = useTranslations("Common");

  return (
    <PageSection
      title={t("sections.topFameTitle")}
      description={t("sections.topFameDescription")}
    >
      <div
        className="grid grid-cols-1 gap-2.5"
        aria-busy="true"
        aria-label={tCommon("a11y.loadingTopFameEarners")}
      >
        {Array.from({ length: HOME_FAME_LIMIT }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3"
          >
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </PageSection>
  );
}

export function RecentKillsFallback() {
  const t = useTranslations("Home");
  const tCommon = useTranslations("Common");

  return (
    <PageSection
      title={t("sections.recentKillsTitle")}
      description={t("sections.recentKillsDescription")}
    >
      <div
        className="space-y-3"
        aria-busy="true"
        aria-label={tCommon("a11y.loadingRecentKills")}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t("autoUpdates")}</p>
          <Skeleton className="h-8 w-[4.75rem]" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: HOME_RECENT_LIMIT }).map((_, i) => (
            <KillCardSkeleton key={i} compactSize="default" />
          ))}
        </div>
      </div>
    </PageSection>
  );
}
