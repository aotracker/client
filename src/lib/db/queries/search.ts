import { and, ilike, inArray, or, sql, type SQLWrapper } from "drizzle-orm";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";

function byExactNameThenFame(
  nameColumn: SQLWrapper,
  fameColumn: SQLWrapper,
  query: string
) {
  return [
    sql`lower(${nameColumn}) <> lower(${query})`,
    sql`${fameColumn} DESC NULLS LAST`,
  ];
}

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
      orderBy: byExactNameThenFame(
        schema.players.name,
        schema.players.killFame,
        query
      ),
      limit,
      columns: {
        id: true,
        albionId: true,
        name: true,
        region: true,
        killFame: true,
      },
      with: {
        guild: {
          columns: { albionId: true, name: true },
        },
      },
    }),
    db.query.guilds.findMany({
      where: and(ilike(schema.guilds.name, pattern), guildRegionFilter),
      orderBy: byExactNameThenFame(
        schema.guilds.name,
        schema.guilds.killFame,
        query
      ),
      limit,
      columns: {
        id: true,
        albionId: true,
        name: true,
        region: true,
        killFame: true,
      },
    }),
    db.query.alliances.findMany({
      where: and(
        allianceRegionFilter,
        or(
          ilike(schema.alliances.name, pattern),
          ilike(schema.alliances.tag, pattern)
        )
      ),
      orderBy: [
        sql`lower(${schema.alliances.name}) <> lower(${query}) AND lower(coalesce(${schema.alliances.tag}, '')) <> lower(${query})`,
        sql`${schema.alliances.killFame} DESC NULLS LAST`,
      ],
      limit,
      columns: {
        id: true,
        albionId: true,
        name: true,
        tag: true,
        region: true,
        memberCount: true,
        killFame: true,
      },
    }),
  ]);

  return { players, guilds, alliances };
}
