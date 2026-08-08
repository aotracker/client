import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";
import { BackLink } from "@/components/BackLink";
import {
  CombinedBattlesContent,
  CombinedBattlesContentFallback,
  type ParsedBattleRef,
} from "@/components/battles/CombinedBattlesContent";
import { buildPageMetadata, notFoundMetadata } from "@/lib/seo";
import { MAX_COMBINED_BATTLES } from "@/lib/battles-constants";
import { regionLabel } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

function parseBattleIds(raw: string | undefined): ParsedBattleRef[] | null {
  if (!raw?.trim()) return null;

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2 || parts.length > MAX_COMBINED_BATTLES) return null;

  const refs: ParsedBattleRef[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const colon = part.indexOf(":");
    if (colon <= 0) return null;
    const region = part.slice(0, colon);
    const battleIdRaw = part.slice(colon + 1);
    if (!isRegionEnabled(region)) return null;
    const battleId = parseInt(battleIdRaw, 10);
    if (Number.isNaN(battleId) || battleId <= 0) return null;
    const key = `${region}:${battleId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ region: region as AlbionRegion, battleId });
  }

  if (refs.length < 2) return null;

  const region = refs[0]!.region;
  if (refs.some((ref) => ref.region !== region)) return null;

  return refs;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const refs = parseBattleIds(params.ids);
  if (!refs) return notFoundMetadata();

  return buildPageMetadata({
    title: `Combined Battles (${refs.length})`,
    description: `Combined stats for ${refs.length} Albion Online battles · ${regionLabel(refs[0]!.region)}`,
    canonicalPath: `/battles/combined?ids=${refs.map((r) => `${r.region}:${r.battleId}`).join(",")}`,
    robots: { index: false, follow: true },
  });
}

export default async function CombinedBattlesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const refs = parseBattleIds(params.ids);
  if (!refs) notFound();

  return (
    <div className="space-y-6">
      <BackLink fallbackHref="/battles" />
      <Suspense
        fallback={<CombinedBattlesContentFallback battleCount={refs.length} />}
      >
        <CombinedBattlesContent refs={refs} />
      </Suspense>
    </div>
  );
}
