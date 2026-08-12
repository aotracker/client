"use client";

import { useState } from "react";
import { Clock, Trophy } from "lucide-react";
import type { AlbionRegion, GuildBattleSummary } from "@/lib/albion/types";
import { BattleCard } from "@/components/BattleCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  /** When true, BattleCard shows per-guild kill/death/fame stats. */
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
    <section className="min-w-0 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Battles</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Filter battles"
        >
          {(
            [
              { id: "recent", label: "Recent", count: recentBattles.length, icon: Clock },
              { id: "top", label: "Top", count: topBattles.length, icon: Trophy },
            ] as const
          ).map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={tab === option.id ? "default" : "outline"}
              aria-pressed={tab === option.id}
              onClick={() => setTab(option.id)}
              className={cn(tab === option.id && "shadow-none")}
            >
              <option.icon className="h-3.5 w-3.5" aria-hidden />
              {option.label}
              <span className="ml-1 tabular-nums opacity-80">{option.count}</span>
            </Button>
          ))}
        </div>
      </div>

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
              guilds={battle.guilds}
              guildCount={battle.guildCount}
            />
          ))
        )}
      </div>
    </section>
  );
}
