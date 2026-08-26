import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Swords } from "lucide-react";
import { PageSection } from "@/components/PageSection";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeudDisplayName } from "@/components/feud/FeudDisplayName";
import { formatFame } from "@/lib/utils";
import { getAllianceByAlbionId } from "@/lib/db/queries";
import type { FeudGuildPairEntry } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { allianceFeudPath, feudPath } from "@/lib/seo";

interface GuildFeudAllianceLinkProps {
  region: AlbionRegion;
  allianceAId: string;
  allianceBId: string;
  allianceAName: string;
  allianceBName: string;
  allianceATag?: string | null;
  allianceBTag?: string | null;
}

function resolveAllianceDisplay(
  alliance: Awaited<ReturnType<typeof getAllianceByAlbionId>>,
  fallbackName: string,
  fallbackTag?: string | null
) {
  return {
    name: alliance?.name?.trim() || fallbackName,
    tag: alliance?.tag?.trim() || fallbackTag?.trim() || null,
  };
}

export async function GuildFeudAllianceLink({
  region,
  allianceAId,
  allianceBId,
  allianceAName,
  allianceBName,
  allianceATag,
  allianceBTag,
}: GuildFeudAllianceLinkProps) {
  const t = await getTranslations("Feud.crossLinks");

  const [allianceA, allianceB] = await Promise.all([
    getAllianceByAlbionId(region, allianceAId),
    getAllianceByAlbionId(region, allianceBId),
  ]);

  const displayA = resolveAllianceDisplay(
    allianceA,
    allianceAName,
    allianceATag
  );
  const displayB = resolveAllianceDisplay(
    allianceB,
    allianceBName,
    allianceBTag
  );

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{t("allianceFeudTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("allianceFeudDescriptionStart")}{" "}
            <FeudDisplayName name={displayA.name} tag={displayA.tag} />{" "}
            {t("allianceFeudDescriptionAnd")}{" "}
            <FeudDisplayName name={displayB.name} tag={displayB.tag} />
          </p>
        </div>
        <Link
          href={allianceFeudPath(region, allianceAId, allianceBId)}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          {t("allianceFeudLink")}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

interface AllianceFeudGuildLinksProps {
  region: AlbionRegion;
  pairs: FeudGuildPairEntry[];
}

export async function AllianceFeudGuildLinks({
  region,
  pairs,
}: AllianceFeudGuildLinksProps) {
  const t = await getTranslations("Feud.crossLinks");

  if (pairs.length === 0) return null;

  return (
    <PageSection
      title={t("guildFeudsTitle")}
      description={t("guildFeudsDescription")}
    >
      <Card>
      <ol className="divide-y divide-border">
        {pairs.map((pair) => {
          const feudHref = feudPath(region, pair.guildAName, pair.guildBName);

          return (
            <li
              key={`${pair.guildAName}-${pair.guildBName}`.toLowerCase()}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={feudHref}
                  className="truncate text-sm font-medium hover:text-primary hover:underline"
                >
                  {pair.guildAName} vs {pair.guildBName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {t("guildFeudLine", {
                    count: pair.killCount,
                    fame: formatFame(pair.fame),
                  })}
                </p>
              </div>
              <Link
                href={feudHref}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Swords className="h-3.5 w-3.5" aria-hidden />
                {t("viewGuildFeud")}
              </Link>
            </li>
          );
        })}
      </ol>
      </Card>
    </PageSection>
  );
}
