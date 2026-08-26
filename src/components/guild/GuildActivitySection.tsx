import { getTranslations } from "next-intl/server";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  GUILD_ACTIVITY_LOOKBACK_DAYS,
  getGuildHourActivity,
} from "@/lib/db/queries";
import { formatUtcHour } from "@/lib/albion/prime-times";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GuildActivityHeatmap } from "@/components/guild/GuildActivityHeatmap";

export async function GuildActivitySection({
  region,
  guildId,
}: {
  region: AlbionRegion;
  guildId: string;
}) {
  const t = await getTranslations("Guild.activity");
  const activity = await getGuildHourActivity(
    region,
    guildId,
    GUILD_ACTIVITY_LOOKBACK_DAYS
  );
  const hasData = activity.hours.some((hour) => hour.uniqueMembers > 0);
  const peakPrime =
    activity.peakPrimeHour != null && activity.peakPrimeUniqueMembers > 0
      ? {
          hour: activity.peakPrimeHour,
          members: activity.peakPrimeUniqueMembers,
        }
      : null;

  return (
    <PageSection
      title={t("title")}
      description={t("description", { days: activity.days })}
      actions={
        peakPrime ? (
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("peakPrimeTime")}
            </p>
            <p className="font-display text-xl font-semibold tabular-nums leading-tight">
              {formatUtcHour(peakPrime.hour)}
              <span className="ml-1 text-sm font-semibold tracking-wide text-primary/80">
                {t("hourAxis")}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t("peakMembers", { members: peakPrime.members })}
            </p>
          </div>
        ) : null
      }
    >
      {hasData ? (
        <GuildActivityHeatmap
          region={region}
          hours={activity.hours}
          peakPrimeHour={peakPrime?.hour ?? null}
        />
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      )}
    </PageSection>
  );
}

export function GuildActivityFallback() {
  return (
    <section className="space-y-3" aria-busy="true" aria-label="Loading activity">
      <div className="space-y-1">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-48 w-full" />
    </section>
  );
}
