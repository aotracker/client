"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Inbox, Star, Trash2 } from "lucide-react";
import { LiveBadge } from "@/components/media/LiveBadge";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { KillCard } from "@/components/KillCard";
import { KillFeedFilters } from "@/components/KillFeedFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KillCardSkeleton } from "@/components/ui/skeleton";
import type { KillCardEvent } from "@/lib/albion/player-history";
import { parseJuicyFlag } from "@/lib/kills-feed-params";
import { entityHref, type WatchlistEntry } from "@/lib/watchlist";
import { regionLabel } from "@/lib/utils";
import { useWatchlist } from "./useWatchlist";

export function WatchlistPageContent() {
  const t = useTranslations("Watchlist");
  const tCommon = useTranslations("Common");
  const tMedia = useTranslations("Media");
  const { entries, ready, remove } = useWatchlist();
  const searchParams = useSearchParams();
  const juicy = parseJuicyFlag(searchParams.get("juicy") ?? undefined);
  const [activity, setActivity] = useState<KillCardEvent[]>([]);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [liveGuildIds, setLiveGuildIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async (
    list: WatchlistEntry[],
    options?: { silent?: boolean }
  ) => {
    if (list.length === 0) {
      setActivity([]);
      setLiveIds(new Set());
      setLiveGuildIds(new Set());
      return;
    }
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: list
            .filter((e) => e.type === "player")
            .map((e) => ({ region: e.region, albionId: e.albionId })),
          guilds: list
            .filter((e) => e.type === "guild")
            .map((e) => ({ region: e.region, albionId: e.albionId })),
          alliances: list
            .filter((e) => e.type === "alliance")
            .map((e) => ({ region: e.region, albionId: e.albionId })),
          juicy,
        }),
      });
      if (!res.ok) throw new Error(t("failedActivity"));
      const data = (await res.json()) as { events: KillCardEvent[] };
      setActivity(data.events ?? []);
      const liveRes = await fetch("/api/media/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: list
            .filter((e) => e.type === "player")
            .map((e) => ({ region: e.region, albionId: e.albionId })),
          guilds: list
            .filter((e) => e.type === "guild")
            .map((e) => ({ region: e.region, albionId: e.albionId })),
        }),
      });
      if (liveRes.ok) {
        const liveData = (await liveRes.json()) as {
          live?: Array<{ region: string; albionId: string }>;
          liveGuilds?: Array<{ region: string; albionId: string }>;
        };
        setLiveIds(
          new Set(
            (liveData.live ?? []).map((row) => `${row.region}:${row.albionId}`)
          )
        );
        setLiveGuildIds(
          new Set(
            (liveData.liveGuilds ?? []).map(
              (row) => `${row.region}:${row.albionId}`
            )
          )
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failedActivity"));
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [juicy, t]);

  useEffect(() => {
    if (!ready) return;
    void loadActivity(entries);
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadActivity(entries, { silent: true });
    }, 20_000);
    return () => window.clearInterval(id);
  }, [ready, entries, loadActivity]);

  if (!ready) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState icon={Star} bordered={false} className="p-0">
            {t("empty")}
          </EmptyState>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {t("pinned", { count: entries.length })}
        </h2>
        <ul className="divide-y divide-border/60 overflow-hidden rounded-md border border-border/60 bg-card/40">
          {entries.map((entry) => (
            <li
              key={`${entry.type}-${entry.region}-${entry.albionId}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Link
                    href={entityHref(entry)}
                    className="truncate text-sm font-medium hover:text-primary hover:underline"
                  >
                    {entry.name}
                  </Link>
                  {(entry.type === "player" &&
                    liveIds.has(`${entry.region}:${entry.albionId}`)) ||
                  (entry.type === "guild" &&
                    liveGuildIds.has(`${entry.region}:${entry.albionId}`)) ? (
                    <LiveBadge label={tMedia("live")} />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.type === "player"
                    ? t("typePlayer")
                    : entry.type === "guild"
                      ? t("typeGuild")
                      : t("typeAlliance")}{" "}
                  ·{" "}
                  {regionLabel(entry.region)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => remove(entry.type, entry.region, entry.albionId)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {tCommon("buttons.remove")}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("recentActivity")}</h2>
          <KillFeedFilters
            show="none"
            showJuicy
            pathname="/watchlist"
          />
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <KillCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <InlineAlert>{error}</InlineAlert>
        ) : activity.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <EmptyState icon={Inbox} bordered={false} className="p-0">
                {t(juicy ? "noJuicyActivity" : "noActivity")}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activity.map((event) => (
              <KillCard
                key={`${event.region}-${event.eventId}`}
                event={event}
                compact
                compactSize="large"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
