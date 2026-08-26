import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const COLORS = {
  kill: "#3dd68c",
  death: "#e85d5d",
  fame: "#f5c14a",
  ip: "#38bdf8",
  muted: "#7d8b9a",
  text: "#d7e0ea",
  border: "#2a3441",
} as const;

function truncateLabel(value: string, max = 22): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function OgShell({
  badge,
  children,
  footer,
}: {
  badge?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        background: "linear-gradient(145deg, #0c0f14 0%, #151a22 55%, #1a2330 100%)",
        color: "#f4f6f8",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#e8edf2",
          }}
        >
          {SITE_NAME}
        </div>
        {badge ? (
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "#9aa7b5",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 999,
              padding: "8px 18px",
            }}
          >
            {badge}
          </div>
        ) : null}
      </div>
      {children}
      {footer ?? <div style={{ display: "flex", height: 1 }} />}
    </div>
  );
}

function StatBlock({
  label,
  value,
  color = COLORS.text,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", fontSize: 18, color: COLORS.muted }}>
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 34,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function createOgImage(options: {
  title: string;
  subtitle: string;
  /** Secondary line under the title (e.g. guild matchup). */
  detail?: string | null;
  stats?: { label: string; value: string }[];
  badge?: string;
}): ImageResponse {
  const stats = options.stats?.slice(0, 3) ?? [];
  const detail = options.detail?.trim() || null;

  return new ImageResponse(
    (
      <OgShell
        badge={options.badge}
        footer={
          <div style={{ display: "flex", gap: 40 }}>
            {stats.map((stat) => (
              <StatBlock key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            {options.title}
          </div>
          {detail ? (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 600,
                color: "#c2ccd6",
                maxWidth: 980,
              }}
            >
              {detail}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#9aa7b5",
              maxWidth: 980,
            }}
          >
            {options.subtitle}
          </div>
        </div>
      </OgShell>
    ),
    { ...OG_SIZE }
  );
}

export type KillOgSide = {
  name: string;
  guild?: string | null;
  ip?: string | null;
};

export function createKillOgImage(options: {
  killer: KillOgSide;
  victim: KillOgSide;
  subtitle: string;
  badge: string;
  fame: string;
  players?: string | null;
}): ImageResponse {
  const side = (
    role: "Killer" | "Victim",
    player: KillOgSide,
    accent: string
  ) => {
    const guild = player.guild?.trim() || null;
    const ip = player.ip?.trim() || null;

    return (
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: 10,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 20,
          background: "rgba(12, 15, 20, 0.45)",
          padding: "28px 30px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {role}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: COLORS.text,
          }}
        >
          {truncateLabel(player.name, 18)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: guild ? "#9aa7b5" : "#5f6b78",
          }}
        >
          {guild ? truncateLabel(guild, 22) : "No guild"}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 8,
            fontSize: 22,
            color: COLORS.ip,
          }}
        >
          {ip ? `${ip} IP` : "IP —"}
        </div>
      </div>
    );
  };

  const footerStats = [
    { label: "Fame", value: options.fame, color: COLORS.fame },
    options.players
      ? { label: "Players", value: options.players, color: COLORS.text }
      : null,
  ].filter(Boolean) as { label: string; value: string; color: string }[];

  return new ImageResponse(
    (
      <OgShell
        badge={options.badge}
        footer={
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 40 }}>
              {footerStats.map((stat) => (
                <StatBlock
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  color={stat.color}
                />
              ))}
            </div>
            <div style={{ display: "flex", fontSize: 22, color: COLORS.muted }}>
              {options.subtitle}
            </div>
          </div>
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            width: "100%",
          }}
        >
          {side("Killer", options.killer, COLORS.kill)}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minWidth: 88,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: COLORS.muted,
              }}
            >
              killed
            </div>
          </div>
          {side("Victim", options.victim, COLORS.death)}
        </div>
      </OgShell>
    ),
    { ...OG_SIZE }
  );
}

export type ProfileOgStat = {
  label: string;
  value: string;
  color?: string;
};

export function createProfileOgImage(options: {
  title: string;
  badge: string;
  region: string;
  affiliation?: string | null;
  stats: ProfileOgStat[];
  meta?: string | null;
  listTitle?: string | null;
  listItems?: string[];
}): ImageResponse {
  const affiliation = options.affiliation?.trim() || null;
  const meta = options.meta?.trim() || null;
  const listItems = (options.listItems ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
  const stats = options.stats.slice(0, 4);

  return new ImageResponse(
    (
      <OgShell
        badge={options.badge}
        footer={
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", fontSize: 22, color: COLORS.muted }}>
              {options.region}
            </div>
            {meta ? (
              <div style={{ display: "flex", fontSize: 22, color: COLORS.muted }}>
                {meta}
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
          </div>
        }
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                maxWidth: 1040,
              }}
            >
              {truncateLabel(options.title, 36)}
            </div>
            {affiliation ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 600,
                  color: "#c2ccd6",
                  maxWidth: 980,
                }}
              >
                {truncateLabel(affiliation, 48)}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 20, width: "100%" }}>
            <div
              style={{
                display: "flex",
                flex: listItems.length > 0 ? 1.35 : 1,
                gap: 16,
              }}
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    gap: 8,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 18,
                    background: "rgba(12, 15, 20, 0.45)",
                    padding: "22px 24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 18,
                      color: COLORS.muted,
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 34,
                      fontWeight: 700,
                      color: stat.color ?? COLORS.text,
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {listItems.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  flexDirection: "column",
                  gap: 10,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 18,
                  background: "rgba(12, 15, 20, 0.45)",
                  padding: "22px 24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: COLORS.muted,
                  }}
                >
                  {options.listTitle ?? "Guilds"}
                </div>
                {listItems.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={{
                      display: "flex",
                      fontSize: 24,
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    {truncateLabel(item, 24)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </OgShell>
    ),
    { ...OG_SIZE }
  );
}

export type BattleOgTableRow = {
  name: string;
  alliance?: string | null;
  players: string;
  kills: string;
  deaths: string;
  averageIp: string;
  fame: string;
};

export function createBattleOgImage(options: {
  title: string;
  subtitle: string;
  mode: "alliances" | "guilds";
  rows: BattleOgTableRow[];
  highlightName?: string | null;
  badge?: string;
}): ImageResponse {
  const rows = options.rows.slice(0, 4);
  const isGuilds = options.mode === "guilds";
  const tableTitle = isGuilds ? "Guilds" : "Alliances";
  const badge = options.badge ?? "Albion Battle";
  const highlight = options.highlightName?.trim().toLowerCase() ?? "";

  const headerCell = (label: string, color: string, flex = 1) => (
    <div
      style={{
        display: "flex",
        flex,
        justifyContent: "flex-end",
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color,
      }}
    >
      {label}
    </div>
  );

  const valueCell = (value: string, color: string, flex = 1) => (
    <div
      style={{
        display: "flex",
        flex,
        justifyContent: "flex-end",
        fontSize: 24,
        fontWeight: 600,
        color,
      }}
    >
      {value}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
          background: "linear-gradient(145deg, #0c0f14 0%, #151a22 55%, #1a2330 100%)",
          color: "#f4f6f8",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#e8edf2",
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "#9aa7b5",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 999,
              padding: "8px 18px",
            }}
          >
            {badge}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            {options.title}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#9aa7b5" }}>
            {options.subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            background: "rgba(12, 15, 20, 0.55)",
            padding: "22px 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              color: "#e8edf2",
            }}
          >
            {tableTitle}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                flex: isGuilds ? 1.35 : 1.6,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: COLORS.muted,
              }}
            >
              {isGuilds ? "Guild" : "Alliance"}
            </div>
            {isGuilds ? (
              <div
                style={{
                  display: "flex",
                  flex: 1.2,
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: COLORS.muted,
                }}
              >
                Alliance
              </div>
            ) : null}
            {headerCell("Players", COLORS.muted, 0.75)}
            {headerCell("Kills", COLORS.kill, 0.7)}
            {headerCell("Deaths", COLORS.death, 0.75)}
            {headerCell("Avg IP", COLORS.ip, 0.75)}
            {headerCell("Fame", COLORS.fame, 0.85)}
          </div>

          {rows.map((row) => {
            const isHighlight =
              Boolean(highlight) && row.name.trim().toLowerCase() === highlight;
            return (
            <div
              key={`${row.name}-${row.alliance ?? ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderTop: `1px solid ${COLORS.border}`,
                paddingTop: 12,
                background: isHighlight ? "rgba(245, 193, 74, 0.12)" : undefined,
                borderRadius: isHighlight ? 8 : 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flex: isGuilds ? 1.35 : 1.6,
                  fontSize: 24,
                  fontWeight: 600,
                  color: isHighlight ? COLORS.fame : COLORS.text,
                }}
              >
                {truncateLabel(row.name, isGuilds ? 16 : 20)}
              </div>
              {isGuilds ? (
                <div
                  style={{
                    display: "flex",
                    flex: 1.2,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {truncateLabel(row.alliance?.trim() || "—", 16)}
                </div>
              ) : null}
              {valueCell(row.players, COLORS.text, 0.75)}
              {valueCell(row.kills, COLORS.kill, 0.7)}
              {valueCell(row.deaths, COLORS.death, 0.75)}
              {valueCell(row.averageIp, COLORS.ip, 0.75)}
              {valueCell(row.fame, COLORS.fame, 0.85)}
            </div>
            );
          })}
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
