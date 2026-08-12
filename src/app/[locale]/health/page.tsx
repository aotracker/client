import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock, Database, Unplug } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getApiSyncState, getGlobalSyncStatus, getRegionEntityCounts } from "@/lib/db/queries";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/InlineAlert";
import { PageHeader } from "@/components/PageSection";
import { formatRelativeTime, regionLabel } from "@/lib/utils";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import {
  getRegionApiHealthLabel,
  type RegionApiHealthLabel,
  type RegionSyncStatus,
} from "@/lib/health/sync-status";

export const dynamic = "force-dynamic";

const HEALTH_ICONS: Record<RegionApiHealthLabel, LucideIcon> = {
  healthy: CheckCircle2,
  delayed: Clock,
  unreachable: Unplug,
  cooling_down: Unplug,
};

interface HealthPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: HealthPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Status" });

  return buildPageMetadata({
    title: t("title"),
    description: t("metaDescription"),
    canonicalPath: "/health",
    robots: NOINDEX_FOLLOW,
    locale,
  });
}

type SyncStateRow = Awaited<ReturnType<typeof getApiSyncState>>[number];
type EntityCountRow = Awaited<ReturnType<typeof getRegionEntityCounts>>[number];

function healthBadgeVariant(
  label: RegionApiHealthLabel
): "success" | "group" | "zvz" {
  if (label === "healthy") return "success";
  if (label === "delayed") return "group";
  return "zvz";
}

export default async function HealthPage({ params }: HealthPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Status");
  const tCommon = await getTranslations("Common");

  let syncStates: SyncStateRow[] = [];
  let globalStatus: Awaited<ReturnType<typeof getGlobalSyncStatus>> | null =
    null;
  let entityCounts: EntityCountRow[] = [];
  let dbError: string | null = null;

  try {
    [syncStates, globalStatus, entityCounts] = await Promise.all([
      getApiSyncState(),
      getGlobalSyncStatus(),
      getRegionEntityCounts(),
    ]);
  } catch (e) {
    dbError =
      e instanceof Error ? e.message : t("databaseUnavailable");
  }

  const countsByRegion = new Map(
    entityCounts.map((row) => [row.region, row])
  );
  const regionStatusByRegion = new Map(
    (globalStatus?.regions ?? []).map((row) => [row.region, row])
  );

  const statusLabelText: Record<RegionApiHealthLabel, string> = {
    healthy: t("healthy"),
    delayed: t("delayed"),
    unreachable: t("unreachable"),
    cooling_down: t("coolingDown"),
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {dbError && (
        <InlineAlert icon={Database}>{t("unavailable")}</InlineAlert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {ENABLED_REGIONS.map((region) => {
          const dbState = syncStates.find((s) => s.region === region);
          const regionStatus = regionStatusByRegion.get(region);
          const apiHealthLabel = regionStatus
            ? getRegionApiHealthLabel(regionStatus)
            : "unreachable";
          const circuitOpen = dbState?.circuitOpen === 1;
          const healthCheckOk = (dbState?.lastHealthCheckOk ?? 0) === 1;
          const counts = countsByRegion.get(region);
          const liveLabel = dbState?.lastHealthCheckAt
            ? healthCheckOk
              ? t("onlineMs", { ms: dbState.avgLatencyMs ?? 0 })
              : t("offlineMs", { ms: dbState.avgLatencyMs ?? 0 })
            : t("awaitingHealthCheck");

          return (
            <HealthRegionCard
              key={region}
              regionLabel={regionLabel(region)}
              apiHealthLabel={apiHealthLabel}
              apiHealthText={statusLabelText[apiHealthLabel]}
              liveLabel={liveLabel}
              circuitOpen={circuitOpen}
              lastIngest={dbState?.lastIngestAt ?? dbState?.lastSuccessAt ?? null}
              lastHealthCheck={dbState?.lastHealthCheckAt ?? null}
              healthCheckOk={healthCheckOk}
              regionStatus={regionStatus}
              players={(counts?.players ?? 0).toLocaleString()}
              guilds={(counts?.guilds ?? 0).toLocaleString()}
              kills={(counts?.kills ?? 0).toLocaleString()}
              battles={(counts?.battles ?? 0).toLocaleString()}
              labels={{
                connectivity: t("connectivity"),
                circuit: t("circuit"),
                circuitOpen: t("circuitOpen"),
                circuitClosed: t("circuitClosed"),
                lastIngest: t("lastIngest"),
                healthCheck: t("healthCheck"),
                healthOk: t("healthOk"),
                healthFailed: t("healthFailed"),
                latestKill: t("latestKill"),
                issues: (list: string) => t("issues", { list }),
                playersTracked: t("playersTracked"),
                guildsTracked: t("guildsTracked"),
                killsTracked: t("killsTracked"),
                battlesTracked: t("battlesTracked"),
                never: tCommon("labels.never"),
                emDash: tCommon("labels.emDash"),
              }}
              badgeVariant={healthBadgeVariant(apiHealthLabel)}
            />
          );
        })}
      </div>
    </div>
  );
}

function HealthRegionCard({
  regionLabel: label,
  apiHealthLabel,
  apiHealthText,
  liveLabel,
  circuitOpen,
  lastIngest,
  lastHealthCheck,
  healthCheckOk,
  regionStatus,
  players,
  guilds,
  kills,
  battles,
  labels,
  badgeVariant,
}: {
  regionLabel: string;
  apiHealthLabel: RegionApiHealthLabel;
  apiHealthText: string;
  liveLabel: string;
  circuitOpen: boolean;
  lastIngest: Date | null;
  lastHealthCheck?: Date | null;
  healthCheckOk?: boolean;
  regionStatus?: RegionSyncStatus;
  players: string;
  guilds: string;
  kills: string;
  battles: string;
  badgeVariant: "success" | "group" | "zvz";
  labels: {
    connectivity: string;
    circuit: string;
    circuitOpen: string;
    circuitClosed: string;
    lastIngest: string;
    healthCheck: string;
    healthOk: string;
    healthFailed: string;
    latestKill: string;
    issues: (list: string) => string;
    playersTracked: string;
    guildsTracked: string;
    killsTracked: string;
    battlesTracked: string;
    never: string;
    emDash: string;
  };
}) {
  const dotClass =
    apiHealthLabel === "healthy"
      ? "bg-green-500"
      : apiHealthLabel === "delayed"
        ? "bg-amber-500"
        : apiHealthLabel === "cooling_down"
          ? "bg-red-500"
          : "bg-yellow-500";
  const StatusIcon = HEALTH_ICONS[apiHealthLabel];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            {label}
            <span className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`} />
          </span>
          <Badge variant={badgeVariant} className="gap-1">
            <StatusIcon className="size-2.5 shrink-0" aria-hidden />
            {apiHealthText}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{labels.connectivity}</span>
          <span className="text-right">{liveLabel}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{labels.circuit}</span>
          <span>{circuitOpen ? labels.circuitOpen : labels.circuitClosed}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{labels.lastIngest}</span>
          <span>
            {lastIngest ? formatRelativeTime(lastIngest) : labels.emDash}
          </span>
        </div>
        {lastHealthCheck != null && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{labels.healthCheck}</span>
            <span className="text-right">
              {healthCheckOk ? labels.healthOk : labels.healthFailed} ·{" "}
              {formatRelativeTime(lastHealthCheck)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{labels.latestKill}</span>
          <span>
            {regionStatus?.latestKillAt
              ? formatRelativeTime(regionStatus.latestKillAt)
              : labels.never}
          </span>
        </div>
        {regionStatus?.issues && regionStatus.issues.length > 0 && (
          <p className="text-xs text-amber-400">
            {labels.issues(
              regionStatus.issues.join(", ").replaceAll("_", " ")
            )}
          </p>
        )}
        <div className="my-2 border-t border-border/50" />
        <div className="flex justify-between">
          <span className="text-muted-foreground">{labels.playersTracked}</span>
          <span>{players}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{labels.guildsTracked}</span>
          <span>{guilds}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{labels.killsTracked}</span>
          <span>{kills}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{labels.battlesTracked}</span>
          <span>{battles}</span>
        </div>
      </CardContent>
    </Card>
  );
}
