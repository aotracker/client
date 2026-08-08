ALTER TABLE "guilds" ADD COLUMN IF NOT EXISTS "top_battles_payload" jsonb;
ALTER TABLE "guilds" ADD COLUMN IF NOT EXISTS "battles_last_synced_at" timestamptz;
