import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PlayerAssociationEntry } from "@/lib/db/queries";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { guildPath, playerPath } from "@/lib/seo";

interface PlayerAssociationsProps {
  allies: PlayerAssociationEntry[];
}

export async function PlayerAssociations({ allies }: PlayerAssociationsProps) {
  const t = await getTranslations("Player.associations");
  const tRegions = await getTranslations("Common.regions");

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {allies.length === 0 ? (
            <EmptyState icon={Users} bordered={false} className="py-4">
              {t("empty")}
            </EmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {allies.map((entry) => {
                const regionKey = entry.region as "americas" | "europe" | "asia";
                const regionDisplay = tRegions.has(regionKey)
                  ? tRegions(regionKey)
                  : entry.region;

                return (
                  <li
                    key={`${entry.region}-${entry.albionId}`}
                    className={cn(
                      "rounded-md border border-border/60 bg-muted/20 p-3",
                      "transition-colors hover:border-primary/40"
                    )}
                  >
                    <Link
                      href={playerPath(entry.region, entry.name)}
                      className="block truncate text-sm font-medium text-stat-kill hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {entry.name}
                    </Link>
                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      <span>{regionDisplay}</span>
                      {entry.guild?.name && (
                        <>
                          <span className="text-muted-foreground/50" aria-hidden>
                            ·
                          </span>
                          {entry.guild.albionId ? (
                            <Link
                              href={guildPath(entry.region, entry.guild.name)}
                              className="truncate hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              {entry.guild.name}
                            </Link>
                          ) : (
                            <span className="truncate">{entry.guild.name}</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                      {entry.encounters === 1
                        ? t("sharedKill", { count: entry.encounters })
                        : t("sharedKills", { count: entry.encounters })}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function PlayerAssociationsFallback() {
  return (
    <section
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading player associations"
    >
      <div className="space-y-1">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="h-3 w-72 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-md border border-border bg-card"
          />
        ))}
      </div>
    </section>
  );
}
