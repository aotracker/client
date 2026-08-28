import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { alliancePath } from "@/lib/seo";
import type { TopAllianceEntry } from "@/lib/db/queries";
import { TopEntityList } from "@/components/leaderboards/TopEntityList";

export async function TopAlliancesList({
  alliances,
  layout = "default",
}: {
  alliances: TopAllianceEntry[];
  layout?: "default" | "wide";
}) {
  const t = await getTranslations("Leaderboards");

  return (
    <TopEntityList
      entries={alliances.map((entry) => ({
        rank: entry.rank,
        key: `${entry.alliance.region}-${entry.alliance.albionId}`,
        name: entry.alliance.name,
        href: alliancePath(entry.alliance.region, entry.alliance.albionId),
        region: entry.alliance.region,
        killFame: entry.killFame,
        killCount: entry.killCount,
      }))}
      layout={layout}
      nameColumnLabel="Alliance"
      emptyIcon={Users}
      emptyMessage={t("emptyAlliances")}
    />
  );
}
