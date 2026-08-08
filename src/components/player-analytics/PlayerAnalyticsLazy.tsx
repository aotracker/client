"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayerAnalytics as PlayerAnalyticsData } from "@/lib/db/queries";

function AnalyticsLoading() {
  return (
    <section className="space-y-3" aria-busy="true" aria-label="Loading analytics">
      <div className="space-y-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

const PlayerAnalyticsDynamic = dynamic(
  () =>
    import("./PlayerAnalytics").then((mod) => ({
      default: mod.PlayerAnalytics,
    })),
  { loading: () => <AnalyticsLoading />, ssr: false }
);

export function PlayerAnalyticsLazy({ data }: { data: PlayerAnalyticsData }) {
  return <PlayerAnalyticsDynamic data={data} />;
}
