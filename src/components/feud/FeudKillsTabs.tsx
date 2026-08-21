"use client";

import { useState } from "react";
import { Clock, Skull } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FeudKillsPage } from "@/lib/db/queries";
import { KillCard } from "@/components/KillCard";
import { EmptyState } from "@/components/EmptyState";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
import { FeudLoadMoreButton } from "@/components/feud/FeudLoadMoreButton";
import type { FeudDaysFilter } from "@/lib/feud/params";

type FeudKillsTab = "recent" | "top";

type FeudKillEvent = FeudKillsPage["kills"][number];

interface FeudKillsTabsProps {
  days: FeudDaysFilter;
  topKills: FeudKillEvent[];
  recentPage: FeudKillsPage;
}

export function FeudKillsTabs({
  days,
  topKills,
  recentPage,
}: FeudKillsTabsProps) {
  const t = useTranslations("Feud.tabs");
  const [tab, setTab] = useState<FeudKillsTab>("recent");

  const descriptions: Record<FeudKillsTab, string> = {
    recent: t("recentDescription", { count: recentPage.total }),
    top: t("topDescription"),
  };

  return (
    <PageSection
      className="min-w-0"
      title={t("title")}
      description={descriptions[tab]}
      actions={
        <FilterSelect
          className="w-[10.5rem]"
          align="end"
          aria-label={t("filterAria")}
          value={tab}
          options={[
            {
              value: "recent",
              label: t("recent"),
              icon: Clock,
              suffix: recentPage.total,
            },
            {
              value: "top",
              label: t("topKills"),
              icon: Skull,
              suffix: topKills.length,
            },
          ]}
          onChange={setTab}
        />
      }
    >
      <div className="min-w-0 space-y-2">
        {tab === "recent" && (
          <>
            {recentPage.kills.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <EmptyState icon={Clock} bordered={false} className="p-0">
                    {t("recentEmpty")}
                  </EmptyState>
                </CardContent>
              </Card>
            ) : (
              recentPage.kills.map((event) => (
                <KillCard
                  key={`feud-recent-${event.eventId}`}
                  event={event}
                  compact
                  compactSize="large"
                />
              ))
            )}
            {recentPage.hasMore && (
              <FeudLoadMoreButton
                days={days}
                offset={recentPage.kills.length}
                label={t("loadMore")}
              />
            )}
          </>
        )}

        {tab === "top" && (
          <>
            {topKills.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <EmptyState icon={Skull} bordered={false} className="p-0">
                    {t("topEmpty")}
                  </EmptyState>
                </CardContent>
              </Card>
            ) : (
              topKills.map((event) => (
                <KillCard
                  key={`feud-top-${event.eventId}`}
                  event={event}
                  compact
                  compactSize="large"
                />
              ))
            )}
          </>
        )}
      </div>
    </PageSection>
  );
}
