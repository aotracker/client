"use client";

import { Link } from "@/i18n/navigation";
import type { AlbionBattleGuildStats, AlbionRegion } from "@/lib/albion/types";
import {
  BattleStatsTableShell,
  battleTableCellClass,
  battleTableCellNumericClass,
  battleTableHeaderClass,
  battleTableHeaderNumericClass,
  battleTableRowClass,
} from "@/components/BattleStatsTableShell";
import { statHeaderClass, statVariantClass } from "@/components/StatValue";
import { cn, formatFame, formatItemPower } from "@/lib/utils";
import { guildPath } from "@/lib/seo";

interface BattleGuildsListProps {
  region: AlbionRegion;
  guilds: AlbionBattleGuildStats[];
}

export function BattleGuildsList({ region, guilds }: BattleGuildsListProps) {
  return (
    <BattleStatsTableShell
      title="Guilds"
      items={guilds}
      searchPlaceholder="Search guilds…"
      searchAriaLabel="Search guilds"
      emptyMessage="No guild data for this battle"
      noMatchMessage={(query) => `No guilds match “${query}”`}
      filterItem={(guild, query) =>
        guild.name.toLowerCase().includes(query) ||
        guild.alliance?.toLowerCase().includes(query) === true
      }
    >
      {(pagedGuilds) => (
        <>
          <thead>
            <tr>
              <th className={battleTableHeaderClass}>Guild</th>
              <th className={cn(battleTableHeaderClass, "w-[4.75rem] sm:w-20")}>Alliance</th>
              <th className={battleTableHeaderNumericClass}>Players</th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("kill"))}>
                Kills
              </th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("death"))}>
                Deaths
              </th>
              <th className={cn(battleTableHeaderNumericClass, "w-14 sm:w-16", statHeaderClass("ip"))}>
                Avg IP
              </th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("fame"))}>
                Fame
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedGuilds.map((guild) => (
              <tr key={guild.id} className={battleTableRowClass}>
                <td className={battleTableCellClass}>
                  <Link
                    href={guildPath(region, guild.name)}
                    className="block truncate font-medium hover:text-primary hover:underline"
                  >
                    {guild.name}
                  </Link>
                </td>
                <td className={cn(battleTableCellClass, "w-[4.75rem] sm:w-20")}>
                  {guild.alliance && guild.allianceId ? (
                    <Link
                      href={`/alliance/${region}/${guild.allianceId}`}
                      className="block truncate text-muted-foreground hover:text-primary hover:underline"
                    >
                      {guild.alliance}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("neutral"))}>
                  {guild.players?.toLocaleString() ?? "—"}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("kill"))}>
                  {guild.kills.toLocaleString()}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("death"))}>
                  {guild.deaths.toLocaleString()}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("ip"))}>
                  {formatItemPower(guild.averageIp) ?? "—"}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("fame"))}>
                  {formatFame(guild.killFame)}
                </td>
              </tr>
            ))}
          </tbody>
        </>
      )}
    </BattleStatsTableShell>
  );
}
