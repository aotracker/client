ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "detail_synced_at" timestamp with time zone;
UPDATE "kill_events" SET "detail_synced_at" = "created_at" WHERE "detail_synced_at" IS NULL;
