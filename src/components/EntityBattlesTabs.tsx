"use client";

import { useState } from "react";
import { Clock, Trophy } from "lucide-react";
import type { AlbionRegion, GuildBattleSummary } from "@/lib/albion/types";
import { BattleCard } from "@/components/BattleCard";
import { EmptyState } from "@/components/EmptyState";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";

type BattlesTab = "recent" | "top";

export interface EntityBattlesTabsProps {
  region: AlbionRegion;
  recentBattles: GuildBattleSummary[];
  topBattles: GuildBattleSummary[];
  recentDescription: string;
  topDescription: string;
  recentLoadingLabel: string | null;
  topLoadingLabel: string | null;
  recentEmptyLabel: string;
  topEmptyLabel: string;
  /** When true, BattleCard shows this guild/alliance's fame, members, kills, and deaths. */
  showGuildStats?: boolean;
}

export function EntityBattlesTabs({
  region,
  recentBattles,
  topBattles,
  recentDescription,
  topDescription,
  recentLoadingLabel,
  topLoadingLabel,
  recentEmptyLabel,
  topEmptyLabel,
  showGuildStats = false,
}: EntityBattlesTabsProps) {
  const [tab, setTab] = useState<BattlesTab>("recent");

  const battles = tab === "recent" ? recentBattles : topBattles;
  const description = tab === "recent" ? recentDescription : topDescription;
  const loadingLabel = tab === "recent" ? recentLoadingLabel : topLoadingLabel;
  const emptyLabel = tab === "recent" ? recentEmptyLabel : topEmptyLabel;

  return (
    <PageSection
      className="min-w-0"
      title="Battles"
      description={description}
      actions={
        <FilterSelect
          className="w-[10.5rem]"
          align="end"
          aria-label="Filter battles"
          value={tab}
          options={[
            {
              value: "recent",
              label: "Recent",
              icon: Clock,
              suffix: recentBattles.length,
            },
            {
              value: "top",
              label: "Top",
              icon: Trophy,
              suffix: topBattles.length,
            },
          ]}
          onChange={setTab}
        />
      }
    >
      <div className="min-w-0 space-y-3">
        {battles.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <EmptyState
                icon={tab === "recent" ? Clock : Trophy}
                bordered={false}
                className="p-0"
              >
                {loadingLabel ?? emptyLabel}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          battles.map((battle) => (
            <BattleCard
              key={`${tab}-${battle.id}`}
              battle={battle}
              region={region}
              showGuildStats={showGuildStats}
              alliances={battle.alliances ?? []}
              allianceCount={battle.allianceCount ?? 0}
              guilds={battle.guilds}
              guildCount={battle.guildCount}
            />
          ))
        )}
      </div>
    </PageSection>
  );
}
