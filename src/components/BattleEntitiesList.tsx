"use client";

import { Link } from "@/i18n/navigation";
import {
  BattleStatsTableShell,
  battleTableAllianceTagColumnClass,
  battleTableCellClass,
  battleTableCellNumericClass,
  battleTableHeaderClass,
  battleTableHeaderNumericClass,
  battleTableNumericColumnClass,
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
  compactNameColumn = false,
}: {
  title: string;
  items: BattleEntityRow[];
  searchPlaceholder: string;
  searchAriaLabel: string;
  emptyMessage: string;
  noMatchMessage: (query: string) => string;
  nameHeader: string;
  showAllianceColumn?: boolean;
  compactNameColumn?: boolean;
}) {
  const nameColumnClass = compactNameColumn
    ? "w-[18%]"
    : undefined;
  const statColumnClass = compactNameColumn
    ? "w-[16.4%]"
    : battleTableNumericColumnClass;
  const ipColumnClass = compactNameColumn ? "w-[16.4%]" : "w-14 sm:w-16";

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
              <th className={cn(battleTableHeaderClass, nameColumnClass)}>
                {nameHeader}
              </th>
              {showAllianceColumn ? (
                <th className={cn(battleTableHeaderClass, battleTableAllianceTagColumnClass)}>
                  Alliance
                </th>
              ) : null}
              <th className={cn(battleTableHeaderNumericClass, statColumnClass)}>
                Players
              </th>
              <th
                className={cn(
                  battleTableHeaderNumericClass,
                  statColumnClass,
                  statHeaderClass("kill")
                )}
              >
                Kills
              </th>
              <th
                className={cn(
                  battleTableHeaderNumericClass,
                  statColumnClass,
                  statHeaderClass("death")
                )}
              >
                Deaths
              </th>
              <th
                className={cn(
                  battleTableHeaderNumericClass,
                  ipColumnClass,
                  statHeaderClass("ip")
                )}
              >
                Avg IP
              </th>
              <th
                className={cn(
                  battleTableHeaderNumericClass,
                  statColumnClass,
                  statHeaderClass("fame")
                )}
              >
                Fame
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((item) => (
              <tr key={item.id} className={battleTableRowClass}>
                <td className={cn(battleTableCellClass, nameColumnClass)}>
                  <Link
                    href={item.href}
                    className="block truncate font-medium hover:text-primary hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
                {showAllianceColumn ? (
                  <td className={cn(battleTableCellClass, battleTableAllianceTagColumnClass)}>
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
                <td
                  className={cn(
                    battleTableCellNumericClass,
                    statColumnClass,
                    statVariantClass("neutral")
                  )}
                >
                  {item.players?.toLocaleString() ?? "—"}
                </td>
                <td
                  className={cn(
                    battleTableCellNumericClass,
                    statColumnClass,
                    statVariantClass("kill")
                  )}
                >
                  {item.kills.toLocaleString()}
                </td>
                <td
                  className={cn(
                    battleTableCellNumericClass,
                    statColumnClass,
                    statVariantClass("death")
                  )}
                >
                  {item.deaths.toLocaleString()}
                </td>
                <td
                  className={cn(
                    battleTableCellNumericClass,
                    ipColumnClass,
                    statVariantClass("ip")
                  )}
                >
                  {formatItemPower(item.averageIp) ?? "—"}
                </td>
                <td
                  className={cn(
                    battleTableCellNumericClass,
                    statColumnClass,
                    statVariantClass("fame")
                  )}
                >
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
