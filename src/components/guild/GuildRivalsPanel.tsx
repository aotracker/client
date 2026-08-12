import { getGuildTopOpponents } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { GuildRivalsSection } from "./GuildRivalsSection";

export async function GuildRivalsPanel({
  region,
  guildId,
  guildName,
}: {
  region: AlbionRegion;
  guildId: string;
  guildName: string;
}) {
  const rivals = await getGuildTopOpponents(region, guildName, {
    days: 30,
    limit: 10,
  });

  return (
    <GuildRivalsSection
      region={region}
      guildId={guildId}
      guildName={guildName}
      rivals={rivals}
    />
  );
}

export function GuildRivalsFallback() {
  return (
    <section aria-busy="true" aria-label="Loading guild rivals">
      <div className="h-48 rounded-md border border-border bg-card" />
    </section>
  );
}
