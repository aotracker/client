# Fluid memory duration — verification checklist

Use after deploying kill/feud cost fixes (Cloudflare rate limits + app changes).

## Baseline (2026-10-11, production)

Directional numbers from log exports before fixes:

| Metric | ~13.5h sample |
|--------|----------------|
| Function rows (kill + feud docs) | ~10.5k |
| Rows with `durationMs >= 299000` | ~480 (~4.6%) |
| Share of GB·s from timeouts | ~60% |
| Total function GB·s (sample) | ~490 |

## 24h after deploy

1. **Vercel** → Project → **Functions** (production, last 24 hours).
   - Compare invocations and Active CPU for:
     - `/[locale]/kill/[region]/[eventId]`
     - `/[locale]/feud/[region]/[guildAName]/[guildBName]`

2. **Export logs** (same window, production) and analyze:

```bash
# From repo root; adjust export filename
node client/scripts/analyze-fluid-log-export.mjs aotracker-log-export-....json
```

Or with jq:

```bash
jq '[.[] | select(.type=="function" and (.durationMs//0)>60000)] | length' export.json
jq '[.[] | select(.type=="function" and (.durationMs//0)>=299000)] | length' export.json
```

## Success criteria (directional)

- 300s-cap rows: **under ~1%** of function invocations on kill/feud.
- Total GB·s on kill/feud document routes: **≥50% lower** than baseline at similar traffic.
- Discord/Twitter link previews on `/battle/…` still show `og:title` / `og:image`.
- Shared kill links still reach pending or detail UI for real browsers.

## Cloudflare

**Security → Events** — rate limit / WAF hits on `/kill/` and `/feud/`; investigate if legit IPs are blocked.
