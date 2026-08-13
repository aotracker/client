import { getTranslations } from "next-intl/server";
import { Swords } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatFame } from "@/lib/utils";
import type { GuildOpponentEntry } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { EmptyState } from "@/components/EmptyState";
import { PageSection } from "@/components/PageSection";
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
      <EmptyState icon={Swords} bordered={false} className="p-0">
        {t("empty")}
      </EmptyState>
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
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Swords className="h-3.5 w-3.5" aria-hidden />
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
    <PageSection
      title={t("title")}
      description={t("description", { guildName })}
    >
      <GuildRivalsList
        region={region}
        guildName={guildName}
        rivals={rivals}
      />
    </PageSection>
  );
}
