"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Inbox, Star, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { KillCard } from "@/components/KillCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KillCardSkeleton } from "@/components/ui/skeleton";
import type { KillCardEvent } from "@/lib/albion/player-history";
import { entityHref, type WatchlistEntry } from "@/lib/watchlist";
import { regionLabel } from "@/lib/utils";
import { useWatchlist } from "./useWatchlist";

export function WatchlistPageContent() {
  const t = useTranslations("Watchlist");
  const tCommon = useTranslations("Common");
  const { entries, ready, remove } = useWatchlist();
  const [activity, setActivity] = useState<KillCardEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async (
    list: WatchlistEntry[],
    options?: { silent?: boolean }
  ) => {
    if (list.length === 0) {
      setActivity([]);
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
        }),
      });
      if (!res.ok) throw new Error(t("failedActivity"));
      const data = (await res.json()) as { events: KillCardEvent[] };
      setActivity(data.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failedActivity"));
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
                <Link
                  href={entityHref(entry)}
                  className="truncate text-sm font-medium hover:text-primary hover:underline"
                >
                  {entry.name}
                </Link>
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
        <h2 className="mb-3 text-lg font-semibold">{t("recentActivity")}</h2>
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
                {t("noActivity")}
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
