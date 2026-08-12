import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { KillCard } from "@/components/KillCard";
import { RecentKillsFeedSection } from "@/components/home/RecentKillsFeedSection";
import { TopKillersList } from "@/components/TopKillersList";
import { TopFameList } from "@/components/leaderboards/TopFameList";
import { PageSection } from "@/components/PageSection";
import {
  getKillFeed,
  getRecentJuicyKills,
  getTopKillers,
  getTopPlayersByKillFame,
  type ContentTypeFilter,
} from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { appendFeedRegionToHref } from "@/lib/region-params";

export {
  JuicyKillsFallback,
  RecentKillsFallback,
  TopFameEarnersFallback,
  TopKillersFallback,
} from "@/components/home/HomeFeedFallbacks";

const HOME_RECENT_LIMIT = 10;
const HOME_JUICY_LIMIT = 10;
const HOME_KILLERS_LIMIT = 10;
const HOME_FAME_LIMIT = 10;

export function HomeFeedGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">{children}</div>
  );
}

export async function JuicyKillsSection({
  region,
}: {
  region: AlbionRegion | "all";
}) {
  const t = await getTranslations("Home");
  const tCommon = await getTranslations("Common");

  let juicyKills: Awaited<ReturnType<typeof getRecentJuicyKills>> = [];
  let error: string | null = null;

  try {
    juicyKills = await getRecentJuicyKills({
      region,
      limit: HOME_JUICY_LIMIT,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : t("errorJuicy");
  }

  if (error) {
    return (
      <PageSection
        title={t("sections.juicyKillsTitle")}
        description={t("sections.juicyKillsDescription")}
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          {t("errorJuicy")}
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title={t("sections.juicyKillsTitle")}
      description={t("sections.juicyKillsDescription")}
      actions={
        <Link
          href={appendFeedRegionToHref("/leaderboards", region, { tab: "kills" })}
          className="text-sm text-primary hover:underline"
        >
          {tCommon("buttons.viewAll")}
        </Link>
      }
    >
      {juicyKills.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t("emptyJuicy")}
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {juicyKills.map((event) => (
            <KillCard
              key={`${event.region}-${event.eventId}`}
              event={event}
              compact
            />
          ))}
        </div>
      )}
    </PageSection>
  );
}

export async function TopKillersSection({
  region,
}: {
  region: AlbionRegion | "all";
}) {
  const t = await getTranslations("Home");
  const tCommon = await getTranslations("Common");

  let topKillers: Awaited<ReturnType<typeof getTopKillers>> = [];
  let error: string | null = null;

  try {
    topKillers = await getTopKillers({
      region,
      limit: HOME_KILLERS_LIMIT,
      days: 7,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : t("errorTopKillers");
  }

  if (error) {
    return (
      <PageSection
        title={t("sections.topKillersTitle")}
        description={t("sections.topKillersDescription")}
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          {t("errorTopKillers")}
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title={t("sections.topKillersTitle")}
      description={t("sections.topKillersDescription")}
      actions={
        <Link
          href={appendFeedRegionToHref("/leaderboards", region, {
            tab: "killers",
          })}
          className="text-sm text-primary hover:underline"
        >
          {tCommon("buttons.viewAll")}
        </Link>
      }
    >
      <TopKillersList killers={topKillers} layout="stack" />
    </PageSection>
  );
}

export async function TopFameEarnersSection({
  region,
}: {
  region: AlbionRegion | "all";
}) {
  const t = await getTranslations("Home");
  const tCommon = await getTranslations("Common");

  let topFame: Awaited<ReturnType<typeof getTopPlayersByKillFame>> = [];
  let error: string | null = null;

  try {
    topFame = await getTopPlayersByKillFame({
      region,
      limit: HOME_FAME_LIMIT,
      days: 7,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : t("errorTopFame");
  }

  if (error) {
    return (
      <PageSection
        title={t("sections.topFameTitle")}
        description={t("sections.topFameDescription")}
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          {t("errorTopFame")}
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title={t("sections.topFameTitle")}
      description={t("sections.topFameDescription")}
      actions={
        <Link
          href={appendFeedRegionToHref("/leaderboards", region, { tab: "fame" })}
          className="text-sm text-primary hover:underline"
        >
          {tCommon("buttons.viewAll")}
        </Link>
      }
    >
      <TopFameList entries={topFame} layout="stack" />
    </PageSection>
  );
}

export async function RecentKillsSection({
  region,
  contentType,
}: {
  region: AlbionRegion | "all";
  contentType: ContentTypeFilter;
}) {
  const t = await getTranslations("Home");

  let feedKills: Awaited<ReturnType<typeof getKillFeed>> = [];
  let error: string | null = null;

  try {
    feedKills = await getKillFeed({
      region,
      contentType,
      limit: HOME_RECENT_LIMIT,
      offset: 0,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : t("errorRecent");
  }

  if (error) {
    return (
      <PageSection
        title={t("sections.recentKillsTitle")}
        description={t("sections.recentKillsDescription")}
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          {t("errorRecent")}
        </div>
      </PageSection>
    );
  }

  if (feedKills.length === 0) {
    return (
      <PageSection
        title={t("sections.recentKillsTitle")}
        description={t("sections.recentKillsDescription")}
      >
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          <p className="font-medium text-foreground">{t("emptyRecentTitle")}</p>
          <p className="mt-2 text-sm">
            {t.rich("emptyRecentBody", {
              searchLink: (chunks) => (
                <Link
                  href="/search"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </PageSection>
    );
  }

  return (
    <RecentKillsFeedSection
      title={t("sections.recentKillsTitle")}
      description={t("sections.recentKillsDescription")}
      initialEvents={feedKills}
      region={region}
      contentType={contentType}
      pageSize={HOME_RECENT_LIMIT}
    />
  );
}
