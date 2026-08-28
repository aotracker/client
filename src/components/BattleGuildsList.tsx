"use client";

import type { AlbionBattleGuildStats, AlbionRegion } from "@/lib/albion/types";
import { BattleEntitiesList } from "@/components/BattleEntitiesList";
import { guildPath } from "@/lib/seo";

export function BattleGuildsList({
  region,
  guilds,
}: {
  region: AlbionRegion;
  guilds: AlbionBattleGuildStats[];
}) {
  return (
    <BattleEntitiesList
      title="Guilds"
      nameHeader="Guild"
      items={guilds.map((guild) => ({
        id: guild.id,
        name: guild.name,
        href: guildPath(region, guild.name),
        allianceName: guild.alliance,
        allianceHref: guild.allianceId
          ? `/alliance/${region}/${guild.allianceId}`
          : null,
        players: guild.players,
        kills: guild.kills,
        deaths: guild.deaths,
        averageIp: guild.averageIp,
        killFame: guild.killFame,
      }))}
      searchPlaceholder="Search guilds…"
      searchAriaLabel="Search guilds"
      emptyMessage="No guild data for this battle"
      noMatchMessage={(query) => `No guilds match “${query}”`}
      showAllianceColumn
    />
  );
}
