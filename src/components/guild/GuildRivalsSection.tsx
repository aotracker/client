import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatFame } from "@/lib/utils";
import type { GuildOpponentEntry } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { feudPath, guildPath } from "@/lib/seo";

interface GuildRivalsListProps {
  region: AlbionRegion;
  guildName: string;
  rivals: GuildOpponentEntry[];
}

export async function GuildRivalsList({
  region,
  guildName,
  rivals,
}: GuildRivalsListProps) {
  const t = await getTranslations("Guild.rivals");

  if (rivals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("empty")}</p>
    );
  }

  return (
    <ol className="divide-y divide-border/60 overflow-hidden rounded-md border border-border/60 bg-card/40">
      {rivals.map((rival) => {
        const feudHref =
          rival.guildName.toLowerCase() !== guildName.toLowerCase()
            ? feudPath(region, guildName, rival.guildName)
            : undefined;

        return (
          <li
            key={rival.guildName.toLowerCase()}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={guildPath(region, rival.guildName)}
                className="truncate text-sm font-medium hover:text-primary hover:underline"
              >
                {rival.guildName}
              </Link>
              <p className="text-xs text-muted-foreground">
                {rival.deathsTo > 0
                  ? t("statsLineWithDeaths", {
                      kills: rival.killsAgainst,
                      fame: formatFame(rival.fameAgainst),
                      deaths: rival.deathsTo,
                      fameLost: formatFame(rival.fameLost),
                    })
                  : t("statsLine", {
                      kills: rival.killsAgainst,
                      fame: formatFame(rival.fameAgainst),
                    })}
              </p>
            </div>
            {feudHref && (
              <Link
                href={feudHref}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                {t("viewFeud")}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export async function GuildRivalsSection({
  region,
  guildId: _guildId,
  guildName,
  rivals,
}: {
  region: AlbionRegion;
  guildId: string;
  guildName: string;
  rivals: GuildOpponentEntry[];
}) {
  const t = await getTranslations("Guild.rivals");

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("description", { guildName })}
          </p>
        </CardHeader>
        <CardContent>
          <GuildRivalsList
            region={region}
            guildName={guildName}
            rivals={rivals}
          />
        </CardContent>
      </Card>
    </section>
  );
}
