import { getTranslations } from "next-intl/server";
import { Swords } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { KillCardServer } from "@/components/KillCardServer";
import { RecentKillsFeedSection } from "@/components/home/RecentKillsFeedSection";
import { TopKillersList } from "@/components/TopKillersList";
import { TopFameList } from "@/components/leaderboards/TopFameList";
import { PageSection } from "@/components/PageSection";
import {
  getKillFeed,
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

  let juicyKills: Awaited<ReturnType<typeof getKillFeed>> = [];
  let error: string | null = null;

  try {
    juicyKills = await getKillFeed({
      region,
      juicy: true,
      limit: HOME_JUICY_LIMIT,
      offset: 0,
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
        <InlineAlert>{t("errorJuicy")}</InlineAlert>
      </PageSection>
    );
  }

  return (
    <PageSection
      title={t("sections.juicyKillsTitle")}
      description={t("sections.juicyKillsDescription")}
      actions={
        <Link
          href={appendFeedRegionToHref("/kills", region, { juicy: "1" })}
          className="text-sm text-primary hover:underline"
        >
          {tCommon("buttons.viewAll")}
        </Link>
      }
    >
      {juicyKills.length === 0 ? (
        <EmptyState icon={Swords}>{t("emptyJuicy")}</EmptyState>
      ) : (
        <div className="space-y-2 stagger-children">
          {juicyKills.map((event) => (
            <KillCardServer
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
        <InlineAlert>{t("errorTopKillers")}</InlineAlert>
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
        <InlineAlert>{t("errorTopFame")}</InlineAlert>
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

  const viewAllHref = appendFeedRegionToHref("/kills", region, {
    ...(contentType !== "all" ? { type: contentType } : {}),
  });
  const tCommon = await getTranslations("Common");

  if (error) {
    return (
      <PageSection
        title={t("sections.recentKillsTitle")}
        description={t("sections.recentKillsDescription")}
        actions={
          <Link
            href={viewAllHref}
            className="text-sm text-primary hover:underline"
          >
            {tCommon("buttons.viewAll")}
          </Link>
        }
      >
        <InlineAlert>{t("errorRecent")}</InlineAlert>
      </PageSection>
    );
  }

  if (feedKills.length === 0) {
    return (
      <PageSection
        title={t("sections.recentKillsTitle")}
        description={t("sections.recentKillsDescription")}
        actions={
          <Link
            href={viewAllHref}
            className="text-sm text-primary hover:underline"
          >
            {tCommon("buttons.viewAll")}
          </Link>
        }
      >
        <EmptyState icon={Swords} title={t("emptyRecentTitle")}>
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
        </EmptyState>
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
      viewAllHref={viewAllHref}
    />
  );
}
