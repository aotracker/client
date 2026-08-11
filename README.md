# AOTrackr — Vercel (Next.js)

**Production host:** Vercel only. Set Root Directory to `client`.

Background workers, Postgres, Redis, and the ingest HTTP API run on the **OVH VM** (`/home/ubuntu/ingest` + Docker Postgres) — see [DEPLOY.md](../DEPLOY.md) and [deploy/vm/README.md](../deploy/vm/README.md).

## What runs here

- Next.js UI + API routes
- Triggers background jobs via ingest HTTP API on the VM
- Reads/writes PostgreSQL

Workers and the ingest API live in [`../ingest/`](../ingest/) and are **never** deployed to Vercel.

## Vercel settings

| Setting | Value |
|---------|-------|
| Root Directory | `client` |
| Install Command | `npm install` (default) |
| Build Command | `npm run build` |

## Environment variables (Vercel production)

### Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL on OVH VM (`postgresql://albion:…@VM_HOST:5432/albion_kills?sslmode=no-verify`) |
| `INGEST_API_URL` | Ingest HTTP API on OVH VM (e.g. `http://VM_HOST:3001`) |
| `INGEST_API_SECRET` | Bearer token for ingest API (must match `/home/ubuntu/ingest/.env`) |
| `CRON_SECRET` | Secures ops `/api/cron/*` and `/status` |
| `DISABLED_REGIONS` | Comma-separated region slugs to skip (e.g. `asia`) |
| `NEXT_PUBLIC_APP_URL` | Canonical public URL (e.g. `https://www.aotracker.net`) |

### Optional

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 |
| `NEXT_PUBLIC_ITEM_ICON_CDN` | CDN base URL for item icons |

### Not needed on Vercel

| Variable | Why |
|---|---|
| `REDIS_URL` | BullMQ runs on OVH VM only |
| `INGEST_API_PORT` | Ingest API port — VM-side only |
| `JOBS_SOURCE` | Worker label — set by PM2 on VM |
| `DATABASE_USE_POOLER` | Defaults to `false`; only set if using PgBouncer |
| `DATABASE_POOL_MAX` | Defaults to `1` on Vercel (`VERCEL=1` auto-detected) |

Copy [.env.example](.env.example) for local development.

## Local development

From `client/`:

```bash
npm install
docker compose -f ../deploy/docker-compose.yml up -d
cp .env.example .env
npm run db:push && npm run dev
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
| `npm run db:push` | Push Drizzle schema to Postgres (local dev only) |
| `npm run db:migrate` | Apply tracked migrations (local dev only) |
| `npm run db:generate` | Generate migrations from schema |
| `npm run db:studio` | Drizzle Studio |

**Production schema changes** are applied from **ingest on the OVH VM** (`npm run db:apply-pending` in `/home/ubuntu/ingest`). Vercel does not run migrations. See [ingest/deploy/vm/README.md](../ingest/deploy/vm/README.md).

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
