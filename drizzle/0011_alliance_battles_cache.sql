ALTER TABLE "alliances" ADD COLUMN IF NOT EXISTS "kill_fame" bigint DEFAULT 0;
ALTER TABLE "alliances" ADD COLUMN IF NOT EXISTS "death_fame" bigint DEFAULT 0;
ALTER TABLE "alliances" ADD COLUMN IF NOT EXISTS "top_battles_payload" jsonb;
ALTER TABLE "alliances" ADD COLUMN IF NOT EXISTS "recent_battles_payload" jsonb;
ALTER TABLE "alliances" ADD COLUMN IF NOT EXISTS "battles_last_synced_at" timestamp with time zone;
