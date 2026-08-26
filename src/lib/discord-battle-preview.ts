import type { BattleOgTableRow } from "@/lib/og";

const COLOR_BATTLE = 0xd4a84b;

function appPublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://www.aotracker.net"
  );
}

function formatFame(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
}

function regionLabel(region: string): string {
  if (region === "europe") return "Europe";
  if (region === "asia") return "Asia";
  return "Americas";
}

type PreviewGuild = {
  name: string;
  alliance?: string | null;
  kills: number;
  deaths: number;
  killFame: number;
  players: number;
  averageIp: number;
  highlight?: boolean;
};

function sampleGuilds(trackedGuildName: string): PreviewGuild[] {
  const name = trackedGuildName.trim() || "Your guild";
  return [
    {
      name,
      alliance: "POE",
      kills: 18,
      deaths: 11,
      killFame: 820_000,
      players: 22,
      averageIp: 1410,
      highlight: true,
    },
    {
      name: "Rivals",
      alliance: "BADD",
      kills: 16,
      deaths: 14,
      killFame: 710_000,
      players: 20,
      averageIp: 1380,
    },
    {
      name: "Third Party",
      alliance: null,
      kills: 9,
      deaths: 12,
      killFame: 390_000,
      players: 15,
      averageIp: 1290,
    },
    {
      name: "Free Company",
      alliance: "ARCH",
      kills: 7,
      deaths: 10,
      killFame: 280_000,
      players: 12,
      averageIp: 1240,
    },
  ];
}

export function battlePreviewOgInput(input: {
  region: string;
  trackedGuildName: string;
}): {
  title: string;
  subtitle: string;
  mode: "guilds";
  rows: BattleOgTableRow[];
  highlightName: string;
  badge: string;
} {
  const guilds = sampleGuilds(input.trackedGuildName);
  const name = guilds[0]!.name;
  return {
    title: `${name} recap`,
    subtitle: `Preview · ${regionLabel(input.region)} · 2.5m fame · 61 kills · 84 players`,
    mode: "guilds",
    highlightName: name,
    badge: "Preview",
    rows: guilds.map((guild) => ({
      name: guild.name,
      alliance: guild.alliance,
      players: guild.players.toLocaleString(),
      kills: guild.kills.toLocaleString(),
      deaths: guild.deaths.toLocaleString(),
      averageIp: String(guild.averageIp),
      fame: formatFame(guild.killFame),
    })),
  };
}

type PreviewEmbed = {
  color: number;
  title: string;
  url: string;
  description: string;
  footer: { text: string };
  image?: { url: string };
};

export function buildBattlePreviewMessageBody(input: {
  region: string;
  trackedGuildName: string;
}) {
  const name = input.trackedGuildName.trim() || "Your guild";
  const guilds = sampleGuilds(name);
  const url = `${appPublicUrl()}/battles?region=${encodeURIComponent(input.region)}`;
  const when = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const tracked = guilds[0]!;
  const embed: PreviewEmbed = {
    color: COLOR_BATTLE,
    title: `${name} battle recap`,
    url,
    description: [
      "**Preview** — sample recap, not a real fight.",
      `${regionLabel(input.region)} · ${when}`,
      "84 players · 61 kills · 2.5m fame",
      `**${tracked.name}**  ${tracked.kills}/${tracked.deaths}  ${formatFame(tracked.killFame)} fame  ${tracked.players} players`,
    ].join("\n"),
    footer: { text: "AOTracker · preview (not a live battle)" },
  };

  return {
    allowed_mentions: { parse: [] as string[] },
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Battles on AOTracker",
            url,
          },
        ],
      },
    ],
  };
}
