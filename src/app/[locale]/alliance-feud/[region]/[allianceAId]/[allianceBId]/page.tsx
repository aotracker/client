import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/BackLink";
import { FeudPageContent } from "@/components/feud/FeudPageContent";
import { FeudDisplayName } from "@/components/feud/FeudDisplayName";
import { Link } from "@/i18n/navigation";
import { getAllianceByAlbionId } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { regionLabel } from "@/lib/utils";
import {
  parseFeudDays,
  parseFeudOffset,
} from "@/lib/feud/params";
import { allianceFeudPath, alliancePath, notFoundMetadata } from "@/lib/seo";
import { feudPageMetadata } from "@/lib/seo-metadata";

interface PageProps {
  params: Promise<{
    locale: string;
    region: string;
    allianceAId: string;
    allianceBId: string;
  }>;
  searchParams: Promise<{ days?: string; offset?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, region, allianceAId, allianceBId } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();

  const albionRegion = region as AlbionRegion;
  const [allianceA, allianceB] = await Promise.all([
    getAllianceByAlbionId(albionRegion, allianceAId),
    getAllianceByAlbionId(albionRegion, allianceBId),
  ]);
  const nameA = allianceA?.name ?? allianceAId;
  const nameB = allianceB?.name ?? allianceBId;

  return feudPageMetadata({
    kind: "alliance",
    nameA,
    nameB,
    region: albionRegion,
    canonicalPath: allianceFeudPath(region, allianceAId, allianceBId),
    locale,
  });
}

export default async function AllianceFeudPage({
  params,
  searchParams,
}: PageProps) {
  const { region, allianceAId, allianceBId } = await params;
  const query = await searchParams;
  if (!isRegionEnabled(region)) notFound();

  const albionRegion = region as AlbionRegion;
  const [allianceA, allianceB] = await Promise.all([
    getAllianceByAlbionId(albionRegion, allianceAId),
    getAllianceByAlbionId(albionRegion, allianceBId),
  ]);
  const nameA = allianceA?.name ?? allianceAId;
  const nameB = allianceB?.name ?? allianceBId;
  const tagA = allianceA?.tag ?? null;
  const tagB = allianceB?.tag ?? null;
  const idA = allianceA?.albionId ?? allianceAId;
  const idB = allianceB?.albionId ?? allianceBId;
  const days = parseFeudDays(query.days);
  const offset = parseFeudOffset(query.offset);
  const t = await getTranslations("Feud");

  return (
    <div className="space-y-6">
      <BackLink />
      <FeudPageContent
        kind="alliance"
        region={albionRegion}
        nameA={nameA}
        nameB={nameB}
        tagA={tagA}
        tagB={tagB}
        idA={idA}
        idB={idB}
        days={days}
        offset={offset}
        header={
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              <Link
                href={alliancePath(albionRegion, idA)}
                className="hover:text-primary hover:underline"
              >
                <FeudDisplayName name={nameA} tag={tagA} />
              </Link>
              {" vs "}
              <Link
                href={alliancePath(albionRegion, idB)}
                className="hover:text-primary hover:underline"
              >
                <FeudDisplayName name={nameB} tag={tagB} />
              </Link>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("allianceMeta", { region: regionLabel(albionRegion) })}
            </p>
          </div>
        }
      />
    </div>
  );
}
