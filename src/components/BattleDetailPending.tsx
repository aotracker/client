"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { regionLabel } from "@/lib/utils";
import type { BattleSyncJobInfo } from "@/lib/jobs/queue";

interface BattleDetailPendingProps {
  region: string;
  battleId: number;
  jobState?: string | null;
  jobInfo?: BattleSyncJobInfo | null;
  /** When true, omit BackLink (used under an existing battle summary). */
  embedded?: boolean;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${hours}h ${minutes}m`;
}

function formatJobState(
  state: string | null | undefined,
  jobInfo?: BattleSyncJobInfo | null
): string {
  if (jobInfo?.detailUnavailable) {
    return "Unavailable — Albion never published this battle (stopped auto-retry)";
  }
  if (jobInfo?.waitingOnAlbionApi && state === "delayed") {
    const next =
      jobInfo.delayMs != null
        ? `next check in ${Math.max(1, Math.round(jobInfo.delayMs / 60_000))}m`
        : "next check scheduled";
    return `Scheduled — waiting for Albion to publish this battle (${next})`;
  }

  switch (state) {
    case "waiting":
      return "Queued (pending) — waiting for worker";
    case "delayed":
      return "Scheduled (pending) — starts after delay / retry / circuit defer";
    case "active":
      return "Processing — fetching from Albion Online";
    case "completed":
      return "Fetch complete — loading cached data";
    case "failed":
      return "Failed — use Retry to re-queue";
    default:
      return "Queued (pending) — waiting for worker";
  }
}

export function BattleDetailPending({
  region,
  battleId,
  jobState,
  jobInfo,
  embedded = false,
}: BattleDetailPendingProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);
  const detailUnavailable = jobInfo?.detailUnavailable === true;
  const failed = jobState === "failed" || detailUnavailable;
  const showApiDelayNotice =
    !detailUnavailable && jobInfo?.showApiDelayNotice === true;
  const apiWaitLabel =
    jobInfo?.apiWaitMs != null ? formatDuration(jobInfo.apiWaitMs) : null;

  useEffect(() => {
    if (failed) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [router, failed]);

  function handleRetry() {
    setRetryError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/battles/${region}/${battleId}/sync`, {
          method: "POST",
        });
        if (!res.ok) {
          throw new Error("Failed to re-queue battle sync");
        }
        router.refresh();
      } catch (e) {
        setRetryError(e instanceof Error ? e.message : "Retry failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {!embedded && <BackLink />}

      {showApiDelayNotice && (
        <div
          role="status"
          className="alert-warning rounded-md px-4 py-3 text-sm"
        >
          <p className="font-medium">Albion API delay</p>
          <p className="mt-1 opacity-90">
            This battle has been waiting
            {apiWaitLabel ? ` ${apiWaitLabel}` : " over an hour"} for Albion
            Online&apos;s gameinfo API to publish it (often a 404 until it
            appears). The worker will keep checking on a longer schedule — no
            action needed unless it eventually fails.
          </p>
        </div>
      )}

      {detailUnavailable && (
        <div
          role="status"
          className="alert-danger rounded-md px-4 py-3 text-sm"
        >
          <p className="font-medium">Battle not published by Albion</p>
          <p className="mt-1 opacity-90">
            Gameinfo kept returning not found for this battle, so automatic
            sync was stopped to avoid endless queue jobs. Use Retry if you
            believe Albion has published it since.
          </p>
        </div>
      )}

      <Card
        className={
          failed
            ? "border-danger-border/30"
            : showApiDelayNotice
              ? "border-warning-border/30"
              : "border-info-border/30"
        }
      >
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          {!failed && (
            <Loader2
              className={`mb-4 h-10 w-10 animate-spin ${
                showApiDelayNotice ? "text-warning" : "text-info"
              }`}
            />
          )}
          <h1 className="text-xl font-semibold">
            {detailUnavailable
              ? "Battle unavailable from Albion"
              : failed
                ? "Could not fetch battle"
                : showApiDelayNotice
                  ? "Still waiting on Albion Online"
                  : "Fetching battle details"}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {detailUnavailable
              ? "Albion’s API never returned this battle after repeated checks. Ingest will no longer re-queue sync jobs for it."
              : failed
                ? "The background job stopped retrying. You can re-queue the fetch below."
                : showApiDelayNotice
                  ? "Albion’s API has not returned this battle yet. We will keep retrying automatically."
                  : "This battle is being fetched from Albion Online and will be available shortly. This page refreshes automatically every few seconds."}
          </p>
          <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium text-foreground">
              {formatJobState(jobState, jobInfo)}
            </span>
          </p>
          {jobInfo?.lastError && !failed && jobInfo.waitingOnAlbionApi && (
            <p className="mt-2 max-w-lg text-[11px] text-muted-foreground">
              Last probe: {jobInfo.lastError}
            </p>
          )}
          {failed && (
            <div className="mt-4 flex flex-col items-center gap-2">
              {(jobInfo?.detailUnavailableError || jobInfo?.lastError) && (
                <p className="max-w-lg text-sm text-danger-foreground">
                  {jobInfo.detailUnavailableError ?? jobInfo.lastError}
                </p>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleRetry}
                disabled={isPending}
              >
                {isPending ? "Re-queuing…" : "Retry fetch"}
              </Button>
              {retryError && (
                <p className="text-sm text-danger-foreground">{retryError}</p>
              )}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            {regionLabel(region)} · Battle ID #{battleId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
