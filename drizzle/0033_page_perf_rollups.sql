CREATE TABLE IF NOT EXISTS "player_day_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "region" "region" NOT NULL,
  "player_id" uuid NOT NULL,
  "utc_date" date NOT NULL,
  "content_type" "content_type" NOT NULL,
  "kill_count" integer DEFAULT 0 NOT NULL,
  "kill_fame" bigint DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_day_stats_bucket_idx"
  ON "player_day_stats" ("region","player_id","utc_date","content_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_day_stats_date_idx"
  ON "player_day_stats" ("utc_date","region","content_type");--> statement-breakpoint
ALTER TABLE "api_sync_state" ADD COLUMN IF NOT EXISTS "latest_kill_at" timestamptz;--> statement-breakpoint
ALTER TABLE "api_sync_state" ADD COLUMN IF NOT EXISTS "player_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_sync_state" ADD COLUMN IF NOT EXISTS "guild_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_sync_state" ADD COLUMN IF NOT EXISTS "kill_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_sync_state" ADD COLUMN IF NOT EXISTS "battle_count" integer DEFAULT 0 NOT NULL;
