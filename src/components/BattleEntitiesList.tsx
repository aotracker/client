"use client";

import { Link } from "@/i18n/navigation";
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

export type BattleEntityRow = {
  id: string;
  name: string;
  href: string;
  allianceName?: string | null;
  allianceHref?: string | null;
  players?: number | null;
  kills: number;
  deaths: number;
  averageIp?: number | null;
  killFame: number;
};

export function BattleEntitiesList({
  title,
  items,
  searchPlaceholder,
  searchAriaLabel,
  emptyMessage,
  noMatchMessage,
  nameHeader,
  showAllianceColumn = false,
}: {
  title: string;
  items: BattleEntityRow[];
  searchPlaceholder: string;
  searchAriaLabel: string;
  emptyMessage: string;
  noMatchMessage: (query: string) => string;
  nameHeader: string;
  showAllianceColumn?: boolean;
}) {
  return (
    <BattleStatsTableShell
      title={title}
      items={items}
      searchPlaceholder={searchPlaceholder}
      searchAriaLabel={searchAriaLabel}
      emptyMessage={emptyMessage}
      noMatchMessage={noMatchMessage}
      filterItem={(item, query) =>
        item.name.toLowerCase().includes(query) ||
        item.allianceName?.toLowerCase().includes(query) === true
      }
    >
      {(paged) => (
        <>
          <thead>
            <tr>
              <th className={battleTableHeaderClass}>{nameHeader}</th>
              {showAllianceColumn ? (
                <th className={cn(battleTableHeaderClass, "w-[4.75rem] sm:w-20")}>
                  Alliance
                </th>
              ) : null}
              <th className={battleTableHeaderNumericClass}>Players</th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("kill"))}>
                Kills
              </th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("death"))}>
                Deaths
              </th>
              <th
                className={cn(
                  battleTableHeaderNumericClass,
                  "w-14 sm:w-16",
                  statHeaderClass("ip")
                )}
              >
                Avg IP
              </th>
              <th className={cn(battleTableHeaderNumericClass, statHeaderClass("fame"))}>
                Fame
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((item) => (
              <tr key={item.id} className={battleTableRowClass}>
                <td className={battleTableCellClass}>
                  <Link
                    href={item.href}
                    className="block truncate font-medium hover:text-primary hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
                {showAllianceColumn ? (
                  <td className={cn(battleTableCellClass, "w-[4.75rem] sm:w-20")}>
                    {item.allianceName && item.allianceHref ? (
                      <Link
                        href={item.allianceHref}
                        className="block truncate text-muted-foreground hover:text-primary hover:underline"
                      >
                        {item.allianceName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ) : null}
                <td className={cn(battleTableCellNumericClass, statVariantClass("neutral"))}>
                  {item.players?.toLocaleString() ?? "—"}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("kill"))}>
                  {item.kills.toLocaleString()}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("death"))}>
                  {item.deaths.toLocaleString()}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("ip"))}>
                  {formatItemPower(item.averageIp) ?? "—"}
                </td>
                <td className={cn(battleTableCellNumericClass, statVariantClass("fame"))}>
                  {formatFame(item.killFame)}
                </td>
              </tr>
            ))}
          </tbody>
        </>
      )}
    </BattleStatsTableShell>
  );
}
