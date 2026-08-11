"use client";

import { useState } from "react";
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
}

export function RecentKillsFeedSection({
  title,
  description,
  initialEvents,
  region,
  contentType,
  pageSize,
}: RecentKillsFeedSectionProps) {
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null);

  return (
    <PageSection
      title={title}
      description={description}
      descriptionActions={
        <>
          Auto-updates every 20s
          {lastPollAt ? ` · checked ${formatRelativeTime(lastPollAt)}` : ""}
        </>
      }
    >
      <KillFeedList
        key={`${region}-${contentType}`}
        initialEvents={initialEvents}
        region={region}
        contentType={contentType}
        pageSize={pageSize}
        preview
        onPollAtChange={setLastPollAt}
      />
    </PageSection>
  );
}
