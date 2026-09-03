"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { KillFeedList, type KillFeedEvent } from "@/components/KillFeedList";
import { PageSection } from "@/components/PageSection";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";
import { formatRelativeTime } from "@/lib/utils";

interface RecentKillsFeedSectionProps {
  title: string;
  description: string;
  initialEvents: KillFeedEvent[];
  region: AlbionRegion | "all";
  contentType: ContentTypeFilter;
  pageSize: number;
  viewAllHref: string;
}

export function RecentKillsFeedSection({
  title,
  description,
  initialEvents,
  region,
  contentType,
  pageSize,
  viewAllHref,
}: RecentKillsFeedSectionProps) {
  const t = useTranslations("Home");
  const tCommon = useTranslations("Common");
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null);
  const [paused, setPaused] = useState(false);

  return (
    <PageSection
      title={title}
      description={description}
      actions={
        <Link
          href={viewAllHref}
          className="text-sm text-primary hover:underline"
        >
          {tCommon("buttons.viewAll")}
        </Link>
      }
    >
      <KillFeedList
        key={`${region}-${contentType}`}
        initialEvents={initialEvents}
        region={region}
        contentType={contentType}
        pageSize={pageSize}
        preview
        home
        onPollAtChange={setLastPollAt}
        onPausedChange={setPaused}
        liveStatus={
          <>
            {paused ? t("paused") : t("autoUpdates")}
            {lastPollAt
              ? t("checkedAt", { relative: formatRelativeTime(lastPollAt) })
              : ""}
          </>
        }
      />
    </PageSection>
  );
}
