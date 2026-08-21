import { notFound, permanentRedirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { withLocalePrefix } from "@/i18n/locales";
import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { FeudPageContent, guildFeudAllianceLink } from "@/components/feud/FeudPageContent";
import { Link } from "@/i18n/navigation";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { resolveFeudFromSegments } from "@/lib/entity-resolve";
import { regionLabel } from "@/lib/utils";
import {
  parseFeudDays,
  parseFeudOffset,
} from "@/lib/feud/params";
import { buildPageMetadata, feudPath, guildPath, notFoundMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{
    region: string;
    guildAName: string;
    guildBName: string;
  }>;
  searchParams: Promise<{ days?: string; offset?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, guildAName, guildBName } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolveFeudFromSegments(
    albionRegion,
    guildAName,
    guildBName
  );
  if (!resolved) return notFoundMetadata();

  const { guildA, guildB } = resolved;

  return buildPageMetadata({
    title: `${guildA.name} vs ${guildB.name} — Guild Feud`,
    description: `Head-to-head PvP stats and recent kills between ${guildA.name} and ${guildB.name} on ${regionLabel(albionRegion)}.`,
    canonicalPath: feudPath(region, guildA.name, guildB.name),
  });
}

export default async function GuildFeudPage({ params, searchParams }: PageProps) {
  const { region, guildAName, guildBName } = await params;
  const query = await searchParams;
  if (!isRegionEnabled(region)) notFound();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolveFeudFromSegments(
    albionRegion,
    guildAName,
    guildBName
  );
  if (!resolved) notFound();
  if (resolved.redirectTo) {
    permanentRedirect(
      withLocalePrefix(await getLocale(), resolved.redirectTo)
    );
  }

  const { guildA, guildB } = resolved;
  const days = parseFeudDays(query.days);
  const offset = parseFeudOffset(query.offset);
  const t = await getTranslations("Feud");

  return (
    <div className="space-y-6">
      <BackLink />
      <FeudPageContent
        kind="guild"
        region={albionRegion}
        nameA={guildA.name}
        nameB={guildB.name}
        idA={guildA.albionId}
        idB={guildB.albionId}
        guildAId={guildA.albionId}
        guildBId={guildB.albionId}
        days={days}
        offset={offset}
        allianceLink={guildFeudAllianceLink(guildA, guildB)}
        header={
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              <Link
                href={guildPath(albionRegion, guildA.name)}
                className="hover:text-primary hover:underline"
              >
                {guildA.name}
              </Link>
              {" vs "}
              <Link
                href={guildPath(albionRegion, guildB.name)}
                className="hover:text-primary hover:underline"
              >
                {guildB.name}
              </Link>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("guildMeta", { region: regionLabel(albionRegion) })}
            </p>
          </div>
        }
      />
    </div>
  );
}
