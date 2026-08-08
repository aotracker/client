# AOTrackr — Vercel (Next.js)

**Production host:** Vercel only. Set Root Directory to `client`.

Background workers, Postgres, Redis, and the ingest HTTP API run on the OVH VM — see [DEPLOY.md](../DEPLOY.md) and [deploy/vm/README.md](../deploy/vm/README.md).

## What runs here

- Next.js UI + API routes
- Triggers background jobs via ingest HTTP API on the VM
- Reads/writes PostgreSQL

Workers and the ingest API live in [`../ingest/`](../ingest/) and are **never** deployed to Vercel.

## Vercel settings

| Setting | Value |
|---------|-------|
| Root Directory | `client` |
| Install Command | `cd .. && npm install -w albion-kill-tracker -w @aotracker/core` ([vercel.json](vercel.json)) |
| Build Command | `npm run build` |

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL on the OVH VM |
| `INGEST_API_URL` | Ingest HTTP API on the OVH VM (e.g. `http://VM_IP:3001`) |
| `INGEST_API_SECRET` | Bearer token for ingest API (must match ingest `.env`) |
| `DATABASE_USE_POOLER` | `false` for co-located Postgres |
| `DATABASE_POOL_MAX` | `1` on Vercel |
| `CRON_SECRET` | Secures ops `/api/cron/*` routes |
| `DISABLED_REGIONS` | Comma-separated region slugs to skip |
| `NEXT_PUBLIC_APP_URL` | Canonical public URL (e.g. `https://www.aotracker.net`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional GA4 ID |
| `NEXT_PUBLIC_ITEM_ICON_CDN` | Optional CDN base for item icons |

Copy [.env.example](.env.example) for local development.

## Local development

From repo root:

```bash
npm install
docker compose -f deploy/docker-compose.yml up -d
cp client/.env.example client/.env
cd client && npm run db:push && npm run dev
```

Start workers and API:

```bash
cd ingest && npm run start
```

Or separately: `npm run worker` and `npm run api`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Push Drizzle schema to Postgres |
| `npm run db:migrate` | Apply tracked migrations |
| `npm run db:generate` | Generate migrations from schema |
| `npm run db:studio` | Drizzle Studio |

VM maintenance scripts (icon cache, one-off schema helpers) are in [`../deploy/vm/scripts/`](../deploy/vm/scripts/) and run via root `npm run vm:*` — not on Vercel.

## Project structure

```
src/
├── app/              # Pages + API routes
├── components/       # UI components
└── lib/              # Albion API, DB, ingest HTTP client
drizzle/              # SQL migrations
data/                 # Item icon manifest + name catalog
public/item-icons/    # Cached item icon PNGs (deployed to Vercel)
vercel.json           # Vercel config
```

## Pages

- `/` — home dashboard
- `/kill/[region]/[eventId]` — kill detail
- `/battle/[region]/[battleId]` — battle detail
- `/player/[region]/[playerId]` — player profile
- `/guild/[region]/[guildId]` — guild profile
- `/alliance/[region]/[allianceId]` — alliance profile
- `/search` — search
- `/health` — public health
- `/status` — ops dashboard (requires `CRON_SECRET`)

Full feature list and architecture: [DEPLOY.md](../DEPLOY.md).
