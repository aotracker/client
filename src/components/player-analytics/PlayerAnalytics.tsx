"use client";

import { useTranslations } from "next-intl";
import { ChartNoAxesColumn } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerAnalytics as PlayerAnalyticsData } from "@/lib/db/queries";
import { ActivityCalendar } from "./ActivityCalendar";
import { ContentMixChart } from "./ContentMixChart";
import { FameOverTimeChart } from "./FameOverTimeChart";
import { TopBuildsList } from "./TopBuildsList";

interface PlayerAnalyticsProps {
  data: PlayerAnalyticsData;
}

export function PlayerAnalytics({ data }: PlayerAnalyticsProps) {
  const t = useTranslations("Player.analytics");
  const isEmpty =
    data.activity.length === 0 &&
    data.fameByDay.length === 0 &&
    data.contentMix.length === 0 &&
    data.topBuilds.length === 0;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState icon={ChartNoAxesColumn} bordered={false} className="p-0">
              {t("empty")}
            </EmptyState>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("activityTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("activityDescription")}
              </p>
            </CardHeader>
            <CardContent>
              <ActivityCalendar activity={data.activity} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("preferredContentTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("preferredContentDescription")}
              </p>
            </CardHeader>
            <CardContent>
              <ContentMixChart contentMix={data.contentMix} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("fameTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("fameDescription")}
              </p>
            </CardHeader>
            <CardContent>
              <FameOverTimeChart fameByDay={data.fameByDay} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("topBuildsTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("topBuildsDescription")}
              </p>
            </CardHeader>
            <CardContent>
              <TopBuildsList topBuilds={data.topBuilds} />
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
