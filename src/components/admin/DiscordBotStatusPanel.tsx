"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelativeTimeLabel } from "@/components/RelativeTime";
import type {
  DiscordBotDisplayStatus,
  DiscordBotStatus,
} from "@/lib/ops/discord-bot-status-shared";

const POLL_MS = 60_000;

const STATUS_LABEL: Record<DiscordBotDisplayStatus, string> = {
  online: "Online",
  error: "Error",
  down: "Down",
  unknown: "Unknown",
};

function statusBadgeVariant(
  status: DiscordBotDisplayStatus
): "solo" | "zvz" | "outline" {
  if (status === "online") return "solo";
  if (status === "error" || status === "down") return "zvz";
  return "outline";
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/50 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

export function DiscordBotStatusPanel({
  initial,
}: {
  initial: DiscordBotStatus;
}) {
  const [status, setStatus] = useState(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        setIsRefreshing(true);
        const res = await fetch("/api/admin/discord", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as DiscordBotStatus;
        if (!cancelled) setStatus(json);
      } catch {
        // Keep last good snapshot
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const ping =
    status.ping != null && status.ping >= 0 ? `${Math.round(status.ping)}ms` : "—";

  return (
    <Card>
      <CardHeader className="space-y-1 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Discord bot
            <Badge variant={statusBadgeVariant(status.displayStatus)}>
              {STATUS_LABEL[status.displayStatus]}
            </Badge>
            {status.tag && (
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {status.tag}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {isRefreshing ? "Refreshing…" : "Live"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Updated <RelativeTimeLabel date={status.fetchedAt} />
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.lastErrorMessage && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {status.lastErrorMessage}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Gateway ping" value={ping} />
          <Metric
            label="Connected servers"
            value={
              status.gatewayGuilds != null
                ? status.gatewayGuilds.toLocaleString()
                : "—"
            }
          />
          <Metric
            label="Last heartbeat"
            value={
              status.lastHeartbeatAt ? (
                <RelativeTimeLabel date={status.lastHeartbeatAt} />
              ) : (
                "None yet"
              )
            }
          />
          <Metric
            label="Active servers"
            value={`${status.activeServers.toLocaleString()} / ${status.servers.toLocaleString()}`}
          />
          <Metric
            label="Feeds with channel"
            value={`${status.feedsWithChannel.toLocaleString()} / ${status.enabledFeeds.toLocaleString()}`}
          />
          <Metric
            label="Posts (last hour)"
            value={
              <>
                {status.postsLastHour.toLocaleString()}
                {status.lastPostAt ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    · last <RelativeTimeLabel date={status.lastPostAt} />
                  </span>
                ) : null}
              </>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
