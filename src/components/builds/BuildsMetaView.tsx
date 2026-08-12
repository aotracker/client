"use client";

import { useLocale, useTranslations } from "next-intl";
import { PackageOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ContentBadge } from "@/components/ContentBadge";
import { EmptyState } from "@/components/EmptyState";
import { ItemIcon } from "@/components/ItemIcon";
import { PageSection } from "@/components/PageSection";
import { WeaponRoleBadge } from "@/components/WeaponRoleBadge";
import { BuildMetaCard } from "@/components/builds/BuildMetaCard";
import { ZVZ_MIN_PLAYERS } from "@/lib/albion/classify";
import type { ContentType } from "@/lib/albion/types";
import type { MetaBuildsResult } from "@/lib/db/queries";
import { getCatalogItemName, getItemFamilyDisplayName } from "@/lib/items/catalog";
import { getWeaponRole } from "@/lib/items/weapon-roles";
import { ITEM_QUALITY_EXCELLENT } from "@/lib/item-icons";
import { cn, formatFame, formatItemName } from "@/lib/utils";

const GROUP_MAX_PLAYERS = ZVZ_MIN_PLAYERS - 1;

const CONTENT_TYPE_ORDER: ContentType[] = ["SOLO", "GROUP", "ZVZ"];

const CONTENT_TYPE_BAR: Record<ContentType, string> = {
  SOLO: "bg-solo",
  GROUP: "bg-group",
  ZVZ: "bg-zvz",
};

const CONTENT_TYPE_TEXT: Record<ContentType, string> = {
  SOLO: "text-solo",
  GROUP: "text-group",
  ZVZ: "text-zvz",
};

const CONTENT_SECTION_META: {
  type: ContentType;
  id: string;
  titleKey: "sections.soloTitle" | "sections.groupTitle" | "sections.zvzTitle";
  blurbKey: "sections.soloBlurb" | "sections.groupBlurb" | "sections.zvzBlurb";
  accent: string;
  tint: string;
}[] = [
  {
    type: "SOLO",
    id: "1v1",
    titleKey: "sections.soloTitle",
    blurbKey: "sections.soloBlurb",
    accent: "bg-solo",
    tint: "from-solo/15 via-transparent to-transparent",
  },
  {
    type: "GROUP",
    id: "group",
    titleKey: "sections.groupTitle",
    blurbKey: "sections.groupBlurb",
    accent: "bg-group",
    tint: "from-group/15 via-transparent to-transparent",
  },
  {
    type: "ZVZ",
    id: "zvz",
    titleKey: "sections.zvzTitle",
    blurbKey: "sections.zvzBlurb",
    accent: "bg-zvz",
    tint: "from-zvz/15 via-transparent to-transparent",
  },
];

interface BuildsMetaViewProps {
  data: MetaBuildsResult;
}

function weaponLabel(itemType: string, locale: string): string {
  return (
    getItemFamilyDisplayName(itemType, locale) ??
    getCatalogItemName(itemType, locale) ??
    formatItemName(itemType)
  );
}

function WeaponUsesMix({
  usesByContentType,
}: {
  usesByContentType: Record<ContentType, number>;
}) {
  const tCommon = useTranslations("Common.contentTypes");
  const segments = CONTENT_TYPE_ORDER.map((type) => ({
    type,
    count: usesByContentType[type] ?? 0,
  })).filter((segment) => segment.count > 0);

  if (segments.length === 0) return null;

  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const contentLabel = (type: ContentType) =>
    type === "SOLO"
      ? tCommon("SOLO")
      : type === "GROUP"
        ? tCommon("GROUP")
        : tCommon("ZVZ");

  return (
    <div className="mt-1.5 space-y-1">
      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-muted/40"
        title={segments
          .map(
            (segment) =>
              `${contentLabel(segment.type)}: ${segment.count.toLocaleString()}`
          )
          .join(" · ")}
      >
        {segments.map((segment) => (
          <div
            key={segment.type}
            className={cn("h-full min-w-px", CONTENT_TYPE_BAR[segment.type])}
            style={{ width: `${(segment.count / total) * 100}%` }}
          />
        ))}
      </div>
      <p className="text-[11px] leading-tight tabular-nums text-muted-foreground">
        {segments.map((segment, index) => (
          <span key={segment.type}>
            {index > 0 && <span className="text-border"> · </span>}
            <span className={CONTENT_TYPE_TEXT[segment.type]}>
              {contentLabel(segment.type)}
            </span>{" "}
            {segment.count.toLocaleString()}
          </span>
        ))}
      </p>
    </div>
  );
}

export function BuildsMetaView({ data }: BuildsMetaViewProps) {
  const t = useTranslations("Builds");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const mixTotal = Math.max(
    1,
    data.contentMix.reduce((sum, e) => sum + e.count, 0)
  );
  const mixByType = new Map(
    data.contentMix.map((e) => [e.contentType, e.count])
  );

  const contentLabel = (type: ContentType) =>
    type === "SOLO"
      ? tCommon("contentTypes.SOLO")
      : type === "GROUP"
        ? tCommon("contentTypes.GROUP")
        : tCommon("contentTypes.ZVZ");

  const sectionBlurb = (
    key: (typeof CONTENT_SECTION_META)[number]["blurbKey"]
  ) => {
    if (key === "sections.groupBlurb") {
      return t(key, { maxPlayers: GROUP_MAX_PLAYERS });
    }
    if (key === "sections.zvzBlurb") {
      return t(key, { minPlayers: ZVZ_MIN_PLAYERS });
    }
    return t(key);
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t("stats.eventsAnalyzed"),
            value: data.totalEvents.toLocaleString(),
            hint: t("stats.eventsHint", { days: data.windowDays }),
          },
          {
            label: t("stats.fameTracked"),
            value: formatFame(data.totalFame),
            hint: t("stats.fameHint"),
          },
          {
            label: t("stats.buildsRanked"),
            value: data.uniqueBuilds.toLocaleString(),
            hint: t("stats.buildsHint"),
          },
          {
            label: t("stats.loadoutsSampled"),
            value: data.totalAppearances.toLocaleString(),
            hint: t("stats.loadoutsHint"),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border/70 bg-gradient-to-br from-muted/40 to-transparent px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="font-display mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <nav
        aria-label={tCommon("a11y.contentMix")}
        className="overflow-hidden rounded-xl border border-border/70 bg-card/70"
      >
        <div className="flex h-1.5 bg-muted">
          {CONTENT_SECTION_META.map((section) => {
            const count = mixByType.get(section.type) ?? 0;
            if (count === 0) return null;
            return (
              <div
                key={section.type}
                className={cn(section.accent)}
                style={{ width: `${(count / mixTotal) * 100}%` }}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {CONTENT_SECTION_META.map((section) => {
            const count = mixByType.get(section.type) ?? 0;
            const pct = ((count / mixTotal) * 100).toFixed(0);
            return (
              <Link
                key={section.id}
                href={`#${section.id}`}
                className="group px-4 py-3.5 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn("size-2 shrink-0 rounded-full", section.accent)}
                  />
                  <span className="text-sm font-medium tracking-tight">
                    {contentLabel(section.type)}
                  </span>
                  <span className="ml-auto font-display text-sm font-semibold tabular-nums text-muted-foreground transition-colors group-hover:text-foreground">
                    {pct}%
                  </span>
                </div>
                <p className="mt-1 pl-4 text-xs tabular-nums text-muted-foreground">
                  {t("pvpEventsCount", { count: count.toLocaleString() })}
                </p>
              </Link>
            );
          })}
        </div>
      </nav>

      {data.topWeapons.length > 0 && (
        <PageSection
          title={t("hottestWeapons.title")}
          description={t("hottestWeapons.description")}
        >
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.topWeapons.map((weapon, index) => {
              const role = getWeaponRole(weapon.itemType);
              const secondaryStat =
                role === "dps"
                  ? weapon.kills > 0
                    ? t("hottestWeapons.killsSuffix", {
                        count: weapon.kills.toLocaleString(),
                      })
                    : ""
                  : weapon.assists > 0
                    ? t("hottestWeapons.assistsSuffix", {
                        count: weapon.assists.toLocaleString(),
                      })
                    : "";

              return (
                <li
                  key={`${weapon.itemType}-${index}`}
                  className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5"
                >
                  <span className="w-5 shrink-0 pt-0.5 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-border/50 bg-card/70 p-0.5">
                    <ItemIcon
                      itemType={weapon.itemType}
                      quality={ITEM_QUALITY_EXCELLENT}
                      width={52}
                      height={52}
                      className="block object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-sm font-medium">
                        {weaponLabel(weapon.itemType, locale)}
                      </p>
                      <WeaponRoleBadge itemType={weapon.itemType} />
                    </div>
                    <WeaponUsesMix usesByContentType={weapon.usesByContentType} />
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {t("hottestWeapons.uses", {
                        count: weapon.appearances.toLocaleString(),
                      })}
                      {secondaryStat}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </PageSection>
      )}

      {CONTENT_SECTION_META.map((section) => {
        const builds = data.byContentType[section.type];

        return (
          <section
            key={section.type}
            id={section.id}
            className={cn(
              "scroll-mt-24 space-y-4 rounded-xl border border-border/60 bg-gradient-to-r p-4 sm:p-5",
              section.tint
            )}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">
                    {t(section.titleKey)}
                  </h2>
                  <ContentBadge type={section.type} />
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {sectionBlurb(section.blurbKey)}
                </p>
              </div>
              <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {t("sections.topByUsage", { count: builds.length })}
              </p>
            </div>

            {builds.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                bordered={false}
                className="rounded-md border border-dashed border-border/70 bg-background/40 px-4 py-10"
              >
                {t("sections.empty", {
                  contentType: contentLabel(section.type),
                  days: data.windowDays,
                })}
              </EmptyState>
            ) : (
              <ol className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {builds.map((build) => (
                  <BuildMetaCard
                    key={`${section.type}-${build.rank}-${build.items.map((i) => i.itemType).join("|")}`}
                    build={build}
                    accentClassName={section.accent}
                  />
                ))}
              </ol>
            )}
          </section>
        );
      })}

      <p className="text-center text-xs text-muted-foreground">
        Ranked by usage across killers, victims, and assists (supports, tanks,
        healers included). Same weapons and gear count together across tiers,
        enchantments, and quality. Icons show the T8 Excellent version of each
        piece. Assist-only weapon sightings merge into full loadouts when
        possible.
      </p>
    </div>
  );
}
