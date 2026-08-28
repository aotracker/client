import { Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { guildPath } from "@/lib/seo";
import type { TopGuildEntry } from "@/lib/db/queries";
import { TopEntityList } from "@/components/leaderboards/TopEntityList";

export async function TopGuildsList({
  guilds,
  layout = "default",
  byHour = false,
}: {
  guilds: TopGuildEntry[];
  layout?: "default" | "wide";
  byHour?: boolean;
}) {
  const t = await getTranslations("Leaderboards");

  return (
    <TopEntityList
      entries={guilds.map((entry) => ({
        rank: entry.rank,
        key: `${entry.guild.region}-${entry.guild.albionId}`,
        name: entry.guild.name,
        href: guildPath(entry.guild.region, entry.guild.name),
        region: entry.guild.region,
        killFame: entry.killFame,
        killCount: entry.killCount,
        uniqueMembers: entry.uniqueMembers,
      }))}
      layout={layout}
      byHour={byHour}
      nameColumnLabel="Guild"
      emptyIcon={Shield}
      emptyMessage={byHour ? t("emptyGuildsHour") : t("emptyGuilds")}
    />
  );
}
