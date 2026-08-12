"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { Card, CardContent } from "@/components/ui/card";

type EntityType = "player" | "guild" | "alliance";

interface ProfileFetchPendingProps {
  entityType: EntityType;
  region: string;
  entityId?: string;
  entityName?: string;
  jobState?: string | null;
}

export function ProfileFetchPending({
  entityType,
  region,
  entityId,
  entityName,
  jobState,
}: ProfileFetchPendingProps) {
  const router = useRouter();
  const namespace =
    entityType === "player"
      ? "Player"
      : entityType === "guild"
        ? "Guild"
        : "Alliance";
  const t = useTranslations(namespace);
  const tJob = useTranslations("Errors.profileJobStates");
  const tLabels = useTranslations("Common.labels");
  const tRegions = useTranslations("Common.regions");
  const tKinds = useTranslations("Common.entityKinds");

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  const jobKey =
    jobState === "waiting" ||
    jobState === "delayed" ||
    jobState === "active" ||
    jobState === "completed" ||
    jobState === "failed"
      ? jobState
      : "waiting";

  const regionKey = region as "americas" | "europe" | "asia";
  const regionDisplay = tRegions.has(regionKey)
    ? tRegions(regionKey)
    : region;

  return (
    <div className="space-y-6">
      <BackLink />

      <Card className="border-info-border/30">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-info" />
          <h1 className="text-xl font-semibold">{t("pending.title")}</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("pending.body")}
          </p>
          <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{tLabels("status")} </span>
            <span className="font-medium text-foreground">{tJob(jobKey)}</span>
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {regionDisplay}
            {entityName ? ` · ${entityName}` : null}
            {entityId
              ? ` · ${tKinds(entityType)} ID ${entityId}`
              : null}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
