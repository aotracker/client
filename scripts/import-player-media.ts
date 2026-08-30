/**
 * Attach seed Twitch channels to Albion players via the admin media APIs.
 * Skips players that already have this Twitch login linked.
 *
 * Dry-run (default):
 *   npx tsx --env-file=.env scripts/import-player-media.ts
 *
 * Apply locally:
 *   npx tsx --env-file=.env scripts/import-player-media.ts --apply
 *
 * Apply to production (CRON_SECRET must match that host):
 *   npx tsx --env-file=.env scripts/import-player-media.ts --base-url https://www.aotracker.net --apply
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CSV = path.join(SCRIPT_DIR, "data", "player-media-seed.csv");
const TWITCH_LOGIN_RE = /^[a-z0-9_]{3,25}$/;
const REGIONS = new Set(["americas", "europe", "asia"]);

type Region = "americas" | "europe" | "asia";

type SeedRow = {
  twitchLogin: string;
  twitchUrl: string;
  playerName: string;
  region: Region;
  playerAlbionId: string;
  confidence: string;
};

type PlayerLink = {
  id: string;
  region: Region;
  playerAlbionId: string;
  playerName: string;
  platform: string;
  channelId: string;
  login: string;
  displayName: string;
};

type ResolvedChannel = {
  platform: "twitch";
  channelId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
};

type Outcome =
  | "already_linked"
  | "would_attach"
  | "attached"
  | "player_missing"
  | "channel_taken"
  | "player_has_other_channel"
  | "twitch_missing"
  | "failed";

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  const eq = process.argv.find((arg) => arg.startsWith(prefix));
  if (eq) return eq.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return undefined;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function playerKey(region: string, albionId: string): string {
  return `${region}:${albionId}`;
}

function parseTwitchLogin(raw: string): string | null {
  const login = raw.trim().replace(/^@/, "").toLowerCase();
  return TWITCH_LOGIN_RE.test(login) ? login : null;
}

function parseCsv(contents: string): SeedRow[] {
  const lines = contents
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const header = lines.shift();
  if (!header) return [];
  const cols = header.split(",").map((col) => col.trim());
  const idx = (name: string) => cols.indexOf(name);

  const rows: SeedRow[] = [];
  for (const line of lines) {
    const parts = line.split(",");
    const twitchLogin = parseTwitchLogin(parts[idx("twitch_login")] ?? "");
    const region = (parts[idx("region")] ?? "").trim();
    const playerAlbionId = (parts[idx("player_albion_id")] ?? "").trim();
    const playerName = (parts[idx("player_name")] ?? "").trim();
    if (!twitchLogin || !playerAlbionId || !playerName) continue;
    if (!REGIONS.has(region)) continue;
    rows.push({
      twitchLogin,
      twitchUrl: (parts[idx("twitch_url")] ?? "").trim(),
      playerName,
      region: region as Region,
      playerAlbionId,
      confidence: (parts[idx("confidence")] ?? "").trim() || "confirmed",
    });
  }
  return rows;
}

async function adminJson<T>(
  baseUrl: string,
  secret: string | null,
  method: "GET" | "POST",
  pathname: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (secret) headers.Authorization = `Bearer ${secret}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, data };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apply = flag("apply");
  const includeLikely = !flag("confirmed-only");
  const csvPath = path.resolve(option("csv") ?? DEFAULT_CSV);
  const baseUrl = (
    option("base-url") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const secret = process.env.CRON_SECRET?.trim() || null;
  const onlyLogin = parseTwitchLogin(option("only") ?? "");

  const rows = parseCsv(readFileSync(csvPath, "utf8")).filter((row) => {
    if (onlyLogin && row.twitchLogin !== onlyLogin) return false;
    if (row.confidence === "confirmed") return true;
    if (includeLikely && row.confidence === "likely") return true;
    return false;
  });

  if (rows.length === 0) {
    console.error(`No seed rows in ${csvPath}`);
    process.exit(1);
  }

  console.log(
    `${apply ? "APPLY" : "DRY-RUN"} ${rows.length} row(s) → ${baseUrl}`
  );

  const listed = await adminJson<{ players?: PlayerLink[] }>(
    baseUrl,
    secret,
    "GET",
    "/api/admin/media"
  );
  if (!listed.ok) {
    console.error(
      `Failed to list media links (${listed.status}): ${listed.data.error ?? "unauthorized"}`
    );
    process.exit(1);
  }

  const existing = (listed.data.players ?? []).filter(
    (link) => link.platform === "twitch"
  );
  const byPlayer = new Map<string, PlayerLink>();
  const byLogin = new Map<string, PlayerLink>();
  for (const link of existing) {
    byPlayer.set(playerKey(link.region, link.playerAlbionId), link);
    byLogin.set(link.login.toLowerCase(), link);
  }

  const counts: Record<Outcome, number> = {
    already_linked: 0,
    would_attach: 0,
    attached: 0,
    player_missing: 0,
    channel_taken: 0,
    player_has_other_channel: 0,
    twitch_missing: 0,
    failed: 0,
  };

  for (const row of rows) {
    const key = playerKey(row.region, row.playerAlbionId);
    const label = `${row.playerName} [${row.region}] ↔ ${row.twitchLogin}`;
    const playerLink = byPlayer.get(key);
    const loginLink = byLogin.get(row.twitchLogin);

    const samePlayer =
      playerLink &&
      playerLink.login.toLowerCase() === row.twitchLogin;
    const sameChannelOnPlayer =
      loginLink &&
      loginLink.region === row.region &&
      loginLink.playerAlbionId === row.playerAlbionId;

    if (samePlayer || sameChannelOnPlayer) {
      counts.already_linked += 1;
      console.log(`skip already linked  ${label}`);
      continue;
    }

    if (
      playerLink &&
      playerLink.login.toLowerCase() !== row.twitchLogin
    ) {
      counts.player_has_other_channel += 1;
      console.log(
        `skip other channel   ${label} (already ${playerLink.login})`
      );
      continue;
    }

    if (loginLink) {
      counts.channel_taken += 1;
      console.log(
        `skip channel taken   ${label} (linked to ${loginLink.playerName} [${loginLink.region}])`
      );
      continue;
    }

    const resolved = await adminJson<ResolvedChannel>(
      baseUrl,
      secret,
      "POST",
      "/api/admin/media/resolve",
      { platform: "twitch", query: row.twitchLogin }
    );
    if (!resolved.ok || !resolved.data.channelId) {
      counts.twitch_missing += 1;
      console.log(
        `skip twitch missing  ${label} (${resolved.data.error ?? resolved.status})`
      );
      continue;
    }

    const channelTakenById = existing.find(
      (link) =>
        link.platform === "twitch" &&
        link.channelId === resolved.data.channelId &&
        (link.region !== row.region ||
          link.playerAlbionId !== row.playerAlbionId)
    );
    if (channelTakenById) {
      counts.channel_taken += 1;
      console.log(
        `skip channel taken   ${label} (channel id already on ${channelTakenById.playerName})`
      );
      continue;
    }

    if (!apply) {
      counts.would_attach += 1;
      console.log(`would attach         ${label}`);
      await sleep(80);
      continue;
    }

    const attached = await adminJson<{ ok?: boolean }>(
      baseUrl,
      secret,
      "POST",
      "/api/admin/media",
      {
        action: "attach",
        target: "player",
        region: row.region,
        albionId: row.playerAlbionId,
        platform: "twitch",
        channelId: resolved.data.channelId,
        login: resolved.data.login,
        displayName: resolved.data.displayName,
        avatarUrl: resolved.data.avatarUrl,
      }
    );
    if (!attached.ok) {
      const err = attached.data.error ?? String(attached.status);
      if (err === "player_not_found") {
        counts.player_missing += 1;
        console.log(`skip player missing  ${label}`);
      } else {
        counts.failed += 1;
        console.log(`fail                 ${label} (${err})`);
      }
      await sleep(80);
      continue;
    }

    counts.attached += 1;
    byPlayer.set(key, {
      id: "",
      region: row.region,
      playerAlbionId: row.playerAlbionId,
      playerName: row.playerName,
      platform: "twitch",
      channelId: resolved.data.channelId,
      login: resolved.data.login,
      displayName: resolved.data.displayName,
    });
    byLogin.set(resolved.data.login.toLowerCase(), byPlayer.get(key)!);
    existing.push(byPlayer.get(key)!);
    console.log(`attached             ${label}`);
    await sleep(120);
  }

  console.log("\nSummary");
  for (const [name, count] of Object.entries(counts)) {
    if (count === 0) continue;
    console.log(`  ${name}: ${count}`);
  }
  if (!apply && counts.would_attach > 0) {
    console.log("\nRe-run with --apply to attach the remaining channels.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
