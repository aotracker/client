import { getTranslations } from "next-intl/server";
import { BattlesFeed } from "@/components/BattlesFeed";
import { BattleCardSkeleton } from "@/components/ui/skeleton";
import { getBattlesFeed } from "@/lib/db/queries";
import { BATTLES_FEED_PAGE_SIZE } from "@/lib/battles-constants";
import type { AlbionRegion } from "@/lib/albion/types";

export function BattlesFeedFallback() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading battles">
      {Array.from({ length: 4 }).map((_, i) => (
        <BattleCardSkeleton key={i} />
      ))}
    </div>
  );
}

export async function BattlesFeedSection({
  region,
  q,
  minPlayers,
}: {
  region: AlbionRegion | "all";
  q?: string;
  minPlayers: number;
}) {
  const t = await getTranslations("Battle");

  let battles: Awaited<ReturnType<typeof getBattlesFeed>> = [];
  let error: string | null = null;

  try {
    battles = await getBattlesFeed({
      region,
      q,
      minPlayers,
      limit: BATTLES_FEED_PAGE_SIZE,
      offset: 0,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : t("feed.failedLoad");
  }

  if (error) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <BattlesFeed
      key={`${region}:${q ?? ""}:${minPlayers}`}
      initialBattles={battles}
      initialTotal={null}
      region={region}
      searchQuery={q}
      minPlayers={minPlayers}
      pageSize={BATTLES_FEED_PAGE_SIZE}
    />
  );
}
