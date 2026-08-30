# AOTrackr — Vercel (Next.js)

**Production host:** Vercel only.

| Checkout | Vercel Root Directory |
|----------|------------------------|
| Production GitHub repo `aotracker/client` | **empty** (this repo *is* the app) |
| Local sibling checkout (`aotracker/client/`) | `client` |

Background workers, Postgres, Redis, and the ingest HTTP API run on the **OVH VM** (`/home/ubuntu/ingest` + Docker Postgres) — see [DEPLOY.md](../DEPLOY.md) and [ingest/deploy/vm/README.md](../ingest/deploy/vm/README.md).

Client is the source of truth for **read queries** and Drizzle migrations in `drizzle/`. Ingest owns write-path helpers. Apply production schema from the VM: `npm run db:apply-pending` in `/home/ubuntu/ingest`.

## What runs here

- Next.js UI + API routes
- Triggers background jobs via ingest HTTP API on the VM
- Reads/writes PostgreSQL

Workers and the ingest API live in [`../ingest/`](../ingest/) and are **never** deployed to Vercel.

## Vercel settings

| Setting | Value |
|---------|-------|
| Root Directory | empty on `aotracker/client`; `client` only for a local monorepo-style checkout |
| Install Command | `npm install` (default) |
| Build Command | `npm run build` |

## Environment variables (Vercel production)

### Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL on OVH VM public IP (`postgresql://albion:…@VM_PUBLIC_IP:5432/albion_kills?sslmode=no-verify`) |
| `INGEST_API_URL` | `https://queue.aotracker.net` (ingest HTTP API; not Cloudflare-proxied today) |
| `INGEST_API_SECRET` | Bearer token for ingest API (must match `/home/ubuntu/ingest/.env`) |
| `CRON_SECRET` | Secures `/api/cron/*` and machine Bearer on `/api/admin/*` |
| `BETTER_AUTH_SECRET` | Better Auth signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Canonical site URL (`http://localhost:3000` / `https://www.aotracker.net`) |
| `DISCORD_CLIENT_ID` | Discord Application ID (same as invite button / bot) |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret (not the bot token) |
| `DISABLED_REGIONS` | Comma-separated region slugs to skip. Empty/unset = all regions enabled |
| `NEXT_PUBLIC_APP_URL` | Canonical public URL (`https://www.aotracker.net`) |

### Optional

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 |
| `NEXT_PUBLIC_ITEM_ICON_CDN` | `https://cdn.aotracker.net/item-icons` (Cloudflare R2 custom domain, prefix `item-icons/`) |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Public Discord Application ID for `/discord` invite + Sign In button visibility |
| `BOOTSTRAP_ADMIN_DISCORD_ID` | Auto-promote this Discord snowflake on first sign-in if no admin exists yet |
| `BOOTSTRAP_ADMIN_GOOGLE_ID` | Auto-promote this Google subject (`sub`) on first sign-in if no admin exists yet |

Discord OAuth redirects (same app as the bot): `http://localhost:3000/api/auth/callback/discord` and `https://www.aotracker.net/api/auth/callback/discord`. Apply auth tables via ingest `npm run db:apply-pending` (includes `db:apply-auth-users`). Promote admins with `npm run promote-admin -- --discord-id <snowflake>` from `ingest/`.

### Not needed on Vercel

| Variable | Why |
|---|---|
| `REDIS_URL` | BullMQ runs on OVH VM only |
| `INGEST_API_PORT` | Ingest API port — VM-side only |
| `JOBS_SOURCE` | Worker label — set by PM2 on VM |
| `DATABASE_USE_POOLER` | Defaults to `false`. Confirmed: omit on Vercel (no PgBouncer). Only set `true` if `DATABASE_URL` uses a transaction pooler. |
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

Start workers and API from `ingest/`:

```bash
cd ../ingest
npm run worker
```

Or `npm run start` (API + scheduler + processors) or `npm run worker` and `npm run api` separately.

Local item icons in `public/item-icons/` are used automatically in development. Production uses `NEXT_PUBLIC_ITEM_ICON_CDN`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run check:drift` | Diff watched `src/lib` copies against sibling `ingest/` |
| `ANALYZE=true npm run analyze` | Client bundle analyzer |
| `npm run db:push` | Push Drizzle schema to Postgres (local dev only) |
| `npm run db:migrate` | Apply tracked migrations (local dev only) |
| `npm run db:generate` | Generate migrations from schema |
| `npm run db:studio` | Drizzle Studio |
| `npm run media:import` | Dry-run Twitch player media seed (`--apply` to write; skips existing links) |

**Production schema changes** are applied from **ingest on the OVH VM** (`npm run db:apply-pending` in `/home/ubuntu/ingest`). Vercel does not run migrations. See [ingest/deploy/vm/README.md](../ingest/deploy/vm/README.md).

## Project structure

```
src/
├── app/              # Pages + API routes
├── components/       # UI components
└── lib/              # Albion API, DB, ingest HTTP client
drizzle/              # SQL migrations
data/                 # Item icon manifest + name catalog
public/item-icons/    # Local/dev item icon PNGs (production uses R2 CDN)
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
- `/admin` — operator console (Discord login + `users.is_admin`; machines use Bearer `CRON_SECRET`)
- `/api/auth/*` — Better Auth (Discord OAuth)

Full feature list and architecture: [DEPLOY.md](../DEPLOY.md).
