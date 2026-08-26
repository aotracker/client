"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KillFeedList, type KillFeedEvent } from "@/components/KillFeedList";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";
import { formatRelativeTime } from "@/lib/utils";

interface KillsFeedSectionProps {
  initialEvents: KillFeedEvent[];
  region: AlbionRegion | "all";
  contentType: ContentTypeFilter;
  minFame: number;
  watchlistOnly: boolean;
  juicy: boolean;
  pageSize: number;
}

export function KillsFeedSection({
  initialEvents,
  region,
  contentType,
  minFame,
  watchlistOnly,
  juicy,
  pageSize,
}: KillsFeedSectionProps) {
  const t = useTranslations("Home");
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null);
  const [paused, setPaused] = useState(false);

  return (
    <KillFeedList
      initialEvents={initialEvents}
      region={region}
      contentType={contentType}
      pageSize={pageSize}
      minFame={minFame}
      watchlistOnly={watchlistOnly}
      juicy={juicy}
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
  );
}
