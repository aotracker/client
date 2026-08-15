import { and, ilike, inArray, or, sql } from "drizzle-orm";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";

export async function searchLocal(query: string, limit = 20) {
  const pattern = `%${query}%`;
  const regionFilter =
    ENABLED_REGIONS.length === 0
      ? sql`false`
      : inArray(schema.players.region, ENABLED_REGIONS);
  const guildRegionFilter =
    ENABLED_REGIONS.length === 0
      ? sql`false`
      : inArray(schema.guilds.region, ENABLED_REGIONS);
  const allianceRegionFilter =
    ENABLED_REGIONS.length === 0
      ? sql`false`
      : inArray(schema.alliances.region, ENABLED_REGIONS);

  const [players, guilds, alliances] = await Promise.all([
    db.query.players.findMany({
      where: and(ilike(schema.players.name, pattern), regionFilter),
      limit,
      with: { guild: true },
    }),
    db.query.guilds.findMany({
      where: and(ilike(schema.guilds.name, pattern), guildRegionFilter),
      limit,
    }),
    db.query.alliances.findMany({
      where: and(
        allianceRegionFilter,
        or(
          ilike(schema.alliances.name, pattern),
          ilike(schema.alliances.tag, pattern)
        )
      ),
      limit,
    }),
  ]);

  return { players, guilds, alliances };
}
