import { getTranslations } from "next-intl/server";
import {
  formatAllianceTag,
  formatExactDateTime,
  formatFame,
} from "@/lib/utils";
import { guildPath } from "@/lib/seo";
import { EntityHeader } from "@/components/EntityHeader";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import { CardContent } from "@/components/ui/card";

interface ProfileHeaderProps {
  player: {
    albionId: string;
    name: string;
    region: string;
    killFame: number | null;
    deathFame: number | null;
    fameRatio: string | null;
    avatar: string | null;
    lastSyncedAt: Date | null;
    guild?: {
      name: string;
      albionId?: string;
      allianceId?: string | null;
      allianceName?: string | null;
      allianceTag?: string | null;
    } | null;
    allianceId?: string | null;
    allianceName?: string | null;
    lifetimeStats?: Record<string, unknown> | null;
  };
  sharePath?: string;
}

export async function ProfileHeader({ player, sharePath }: ProfileHeaderProps) {
  const t = await getTranslations("Player");
  const tStats = await getTranslations("Common.stats");
  const tLabels = await getTranslations("Common.labels");
  const tRegions = await getTranslations("Common.regions");

  const allianceId = player.guild?.allianceId ?? player.allianceId;
  const allianceName = player.guild?.allianceName ?? player.allianceName;
  const allianceTag = player.guild?.allianceTag ?? null;
  const hasAlliance = Boolean(allianceId?.trim());
  const allianceLabel = allianceName
    ? formatAllianceTag(allianceName, allianceTag)
    : null;

  const regionKey = player.region as "americas" | "europe" | "asia";
  const regionDisplay = tRegions.has(regionKey)
    ? tRegions(regionKey)
    : player.region;

  const affiliations = [
    { key: "region", label: regionDisplay },
    ...(player.guild
      ? [
          {
            key: "guild",
            label: player.guild.name,
            href: guildPath(player.region, player.guild.name),
          },
        ]
      : []),
    ...(allianceLabel
      ? [
          {
            key: "alliance",
            label: allianceLabel,
            href: hasAlliance
              ? `/alliance/${player.region}/${allianceId}`
              : undefined,
            title: allianceName ?? undefined,
          },
        ]
      : []),
  ];

  const lifetime =
    player.lifetimeStats != null ? (
      <LifetimeStats
        stats={player.lifetimeStats}
        titles={{
          lifetimeFame: tLabels("lifetimeFame"),
          pve: tLabels("pve"),
          gathering: tLabels("gathering"),
          other: tLabels("other"),
        }}
      />
    ) : null;

  return (
    <EntityHeader
      title={player.name}
      kind={t("kind")}
      affiliations={affiliations}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <WatchlistButton
            type="player"
            region={player.region}
            albionId={player.albionId}
            name={player.name}
          />
          {sharePath ? <ShareLinkButton path={sharePath} /> : null}
        </div>
      }
      stats={[
        {
          label: tStats("lifetimeKillFame"),
          mobileLabel: tStats("killFame"),
          value: formatFame(player.killFame),
          variant: "kill",
        },
        {
          label: tStats("lifetimeDeathFame"),
          mobileLabel: tStats("deathFame"),
          value: formatFame(player.deathFame),
          variant: "death",
        },
        {
          label: tStats("kdRatio"),
          mobileLabel: tStats("kdShort"),
          value: player.fameRatio
            ? parseFloat(player.fameRatio).toFixed(2)
            : tLabels("emDash"),
          variant: "neutral",
        },
      ]}
      entityId={player.albionId}
      entityIdLabel={tLabels("albionPlayerId")}
      footerMeta={
        player.lastSyncedAt ? (
          <p className="text-xs">
            {tLabels("lastUpdated", {
              datetime: formatExactDateTime(player.lastSyncedAt),
            })}
          </p>
        ) : null
      }
    >
      {lifetime && (
        <CardContent className="border-t border-border/40 pt-4">
          {lifetime}
        </CardContent>
      )}
    </EntityHeader>
  );
}

function formatStatLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").trim();
}

function toStatNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (obj.Total != null) return toStatNumber(obj.Total);
    if (obj.total != null) return toStatNumber(obj.total);
  }
  return null;
}

function summarizeSection(
  section: Record<string, unknown> | undefined
): [string, number][] {
  if (!section) return [];

  const items: [string, number][] = [];
  for (const [key, value] of Object.entries(section)) {
    const num = toStatNumber(value);
    if (num != null && num > 0) {
      items.push([formatStatLabel(key), num]);
    }
  }
  return items;
}

function sortItems(items: [string, number][], order: string[]): [string, number][] {
  return [...items].sort((a, b) => {
    const ai = order.indexOf(a[0]);
    const bi = order.indexOf(b[0]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

const PVE_ORDER = ["Total", "Royal", "Outlands", "Avalon", "Hellgate"];
const GATHERING_ORDER = ["All", "Fiber", "Hide", "Ore", "Rock", "Wood"];
const OTHER_ORDER = ["Crafting", "Fishing", "Farming"];

function FameStatSection({
  title,
  items,
  totalKey,
  gridClass = "grid-cols-2 sm:grid-cols-3",
}: {
  title: string;
  items: [string, number][];
  totalKey?: string;
  gridClass?: string;
}) {
  if (items.length === 0) return null;

  const total = totalKey ? items.find(([label]) => label === totalKey)?.[1] : undefined;
  const gridItems = totalKey
    ? items.filter(([label]) => label !== totalKey)
    : items;

  return (
    <div className="rounded-lg border border-border/40 bg-muted/5 p-2.5 opacity-90">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
        {total != null && (
          <span className="text-xs tabular-nums text-stat-neutral">
            {formatFame(total)}
          </span>
        )}
      </div>
      <div className={`grid gap-1.5 ${gridClass}`}>
        {gridItems.map(([label, value]) => (
          <div
            key={label}
            className="rounded border border-border/30 bg-background/30 px-2 py-1.5 text-center"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
              {label}
            </p>
            <p className="mt-0.5 text-xs font-medium tabular-nums text-stat-neutral">
              {formatFame(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LifetimeStats({
  stats,
  titles,
}: {
  stats: Record<string, unknown>;
  titles: {
    lifetimeFame: string;
    pve: string;
    gathering: string;
    other: string;
  };
}) {
  const pveItems = sortItems(
    summarizeSection(stats.PvE as Record<string, unknown> | undefined),
    PVE_ORDER
  );

  const gatheringItems = sortItems(
    summarizeSection(stats.Gathering as Record<string, unknown> | undefined),
    GATHERING_ORDER
  );

  const craftingItems = summarizeSection(
    stats.Crafting as Record<string, unknown> | undefined
  );
  const otherItems = sortItems(
    [
      ...craftingItems.map(
        ([label, value]): [string, number] =>
          label === "Total" ? ["Crafting", value] : [label, value]
      ),
      ...(toStatNumber(stats.FishingFame) != null
        ? ([["Fishing", toStatNumber(stats.FishingFame)!]] as [string, number][])
        : []),
      ...(toStatNumber(stats.FarmingFame) != null
        ? ([["Farming", toStatNumber(stats.FarmingFame)!]] as [string, number][])
        : []),
    ],
    OTHER_ORDER
  );

  const hasAny =
    pveItems.length > 0 || gatheringItems.length > 0 || otherItems.length > 0;

  if (!hasAny) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
        {titles.lifetimeFame}
      </p>
      <div className="grid gap-2 lg:grid-cols-2">
        <FameStatSection
          title={titles.pve}
          items={pveItems}
          totalKey="Total"
          gridClass="grid-cols-2 sm:grid-cols-4"
        />
        <FameStatSection
          title={titles.other}
          items={otherItems}
          gridClass="grid-cols-2 sm:grid-cols-3"
        />
      </div>
      <FameStatSection
        title={titles.gathering}
        items={gatheringItems}
        totalKey="All"
        gridClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      />
    </div>
  );
}
