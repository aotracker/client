"use client";

import { Link } from "@/i18n/navigation";
import type { AlbionBattleAllianceStats, AlbionRegion } from "@/lib/albion/types";
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

interface BattleAlliancesListProps {
  region: AlbionRegion;
  alliances: AlbionBattleAllianceStats[];
}

export function BattleAlliancesList({ region, alliances }: BattleAlliancesListProps) {
  return (
    <BattleStatsTableShell
      title="Alliances"
      items={alliances}
      searchPlaceholder="Search alliances…"
      searchAriaLabel="Search alliances"
      emptyMessage="No alliance data for this battle"
      noMatchMessage={(query) => `No alliances match “${query}”`}
      filterItem={(alliance, query) => alliance.name.toLowerCase().includes(query)}
    >
      {(pagedAlliances) => (
        <>
          <thead>
            <tr>
              <th className={battleTableHeaderClass}>Alliance</th>
              <th className={battleTableHeaderNumericClass}>Players</th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("kill"))}>
                Kills
              </th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("death"))}>
                Deaths
              </th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("ip"))}>
                Avg IP
              </th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("fame"))}>
                Fame
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedAlliances.map((alliance) => (
              <tr key={alliance.id} className={battleTableRowClass}>
                <td className={battleTableCellClass}>
                  <Link
                    href={`/alliance/${region}/${alliance.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {alliance.name}
                  </Link>
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("neutral"))}>
                  {alliance.players?.toLocaleString() ?? "—"}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("kill"))}>
                  {alliance.kills.toLocaleString()}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("death"))}>
                  {alliance.deaths.toLocaleString()}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("ip"))}>
                  {formatItemPower(alliance.averageIp) ?? "—"}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("fame"))}>
                  {formatFame(alliance.killFame)}
                </td>
              </tr>
            ))}
          </tbody>
        </>
      )}
    </BattleStatsTableShell>
  );
}
