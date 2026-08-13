import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import { getCachedBattleDetail } from "@/lib/db/battle-cache";
import { ensureBattleDetailQueued } from "@/lib/jobs/queue";
import {
  createBattleOgImage,
  createOgImage,
  OG_CONTENT_TYPE,
  OG_SIZE,
  type BattleOgTableRow,
} from "@/lib/og";
import { formatExactDateTime, formatFame, formatItemPower, regionLabel } from "@/lib/utils";

export const alt = "Battle details";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const TOP_ROWS = 4;

interface Props {
  params: Promise<{ region: string; battleId: string }>;
}

export default async function Image({ params }: Props) {
  const { region, battleId } = await params;
  const parsedBattleId = parseInt(battleId, 10);

  if (!isRegionEnabled(region) || Number.isNaN(parsedBattleId)) {
    return createOgImage({
      title: "Battle not found",
      subtitle: "This battle is unavailable.",
      badge: regionLabel(region),
    });
  }

  const albionRegion = region as AlbionRegion;
  const cached = await getCachedBattleDetail(albionRegion, parsedBattleId);

  if (!cached) {
    await ensureBattleDetailQueued(albionRegion, parsedBattleId);
    return createOgImage({
      title: `Albion Battle #${parsedBattleId}`,
      subtitle: "Battle data is loading…",
      badge: regionLabel(region),
    });
  }

  const battle = cached.battle;
  const alliances = cached.alliances;
  const guilds = cached.guilds;

  const useAlliances = alliances.length > 0;
  const source = useAlliances ? alliances : guilds;
  const top = source.slice(0, TOP_ROWS);

  const totalPlayers =
    battle.totalPlayers ??
    (battle.players ? Object.keys(battle.players).length : 0);
  const startedAt = battle.startTime
    ? formatExactDateTime(battle.startTime)
    : null;
  const battleSummary = [
    regionLabel(region),
    startedAt,
    `${formatFame(battle.totalFame)} fame`,
    `${battle.totalKills ?? 0} kills`,
    `${totalPlayers} players`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (top.length === 0) {
    return createOgImage({
      title: `Albion Battle #${battle.id ?? parsedBattleId}`,
      subtitle: battleSummary,
      badge: "Albion Battle",
      stats: [
        { label: "Fame", value: formatFame(battle.totalFame) },
        { label: "Kills", value: String(battle.totalKills ?? 0) },
        {
          label: "Players",
          value: String(totalPlayers),
        },
      ],
    });
  }

  const rows: BattleOgTableRow[] = top.map((row) => {
    if (useAlliances) {
      const alliance = row as (typeof alliances)[number];
      return {
        name: alliance.name,
        players: alliance.players?.toLocaleString() ?? "—",
        kills: alliance.kills.toLocaleString(),
        deaths: alliance.deaths.toLocaleString(),
        averageIp: formatItemPower(alliance.averageIp) ?? "—",
        fame: formatFame(alliance.killFame),
      };
    }

    const guild = row as (typeof guilds)[number];
    return {
      name: guild.name,
      alliance: guild.alliance ?? null,
      players: guild.players?.toLocaleString() ?? "—",
      kills: guild.kills.toLocaleString(),
      deaths: guild.deaths.toLocaleString(),
      averageIp: formatItemPower(guild.averageIp) ?? "—",
      fame: formatFame(guild.killFame),
    };
  });

  return createBattleOgImage({
    title: `Albion Battle #${battle.id ?? parsedBattleId}`,
    subtitle: battleSummary,
    mode: useAlliances ? "alliances" : "guilds",
    rows,
  });
}
