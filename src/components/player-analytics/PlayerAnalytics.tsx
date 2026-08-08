"use client";

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
  const isEmpty =
    data.activity.length === 0 &&
    data.fameByDay.length === 0 &&
    data.contentMix.length === 0 &&
    data.topBuilds.length === 0;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Player Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Based on cached kill/death history · last 30 days
        </p>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No analytics yet. Kill and death history will appear here once
            cached.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
              <p className="text-xs text-muted-foreground">
                Last 30 days · PvP events participated in per day
              </p>
            </CardHeader>
            <CardContent>
              <ActivityCalendar activity={data.activity} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferred content</CardTitle>
              <p className="text-xs text-muted-foreground">
                Last 30 days · mix of 1v1, group, and ZvZ fights
              </p>
            </CardHeader>
            <CardContent>
              <ContentMixChart contentMix={data.contentMix} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Fame earned vs lost</CardTitle>
              <p className="text-xs text-muted-foreground">
                Last 30 days · daily kill fame as killer vs victim
              </p>
            </CardHeader>
            <CardContent>
              <FameOverTimeChart fameByDay={data.fameByDay} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Top Player Builds</CardTitle>
              <p className="text-xs text-muted-foreground">
                Last 30 days · Same weapons/gear across tiers · shown as T8
                Excellent
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
