"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { Card, CardContent } from "@/components/ui/card";
import { regionLabel } from "@/lib/utils";

type EntityType = "player" | "guild" | "alliance";

interface ProfileFetchPendingProps {
  entityType: EntityType;
  region: string;
  entityId: string;
  jobState?: string | null;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  player: "player profile",
  guild: "guild profile",
  alliance: "alliance profile",
};

function formatJobState(state: string | null | undefined): string {
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
      return "Fetch failed — retrying on refresh";
    default:
      return "Queued (pending) — waiting for worker";
  }
}

export function ProfileFetchPending({
  entityType,
  region,
  entityId,
  jobState,
}: ProfileFetchPendingProps) {
  const router = useRouter();
  const label = ENTITY_LABELS[entityType];

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="space-y-6">
      <BackLink />

      <Card className="border-info-border/30">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-info" />
          <h1 className="text-xl font-semibold">Fetching {label}</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            This {entityType} is not cached yet. A background job is fetching it from
            Albion Online and saving it locally. This page refreshes automatically every
            few seconds.
          </p>
          <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium text-foreground">{formatJobState(jobState)}</span>
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {regionLabel(region)} · {entityType} ID {entityId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
