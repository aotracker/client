"use client";

import type { AlbionBattleAllianceStats, AlbionRegion } from "@/lib/albion/types";
import { BattleEntitiesList } from "@/components/BattleEntitiesList";

export function BattleAlliancesList({
  region,
  alliances,
}: {
  region: AlbionRegion;
  alliances: AlbionBattleAllianceStats[];
}) {
  return (
    <BattleEntitiesList
      title="Alliances"
      nameHeader="Alliance"
      items={alliances.map((alliance) => ({
        id: alliance.id,
        name: alliance.name,
        href: `/alliance/${region}/${alliance.id}`,
        players: alliance.players,
        kills: alliance.kills,
        deaths: alliance.deaths,
        averageIp: alliance.averageIp,
        killFame: alliance.killFame,
      }))}
      searchPlaceholder="Search alliances…"
      searchAriaLabel="Search alliances"
      emptyMessage="No alliance data for this battle"
      noMatchMessage={(query) => `No alliances match “${query}”`}
    />
  );
}
