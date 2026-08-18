ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "feed_preview" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "battles_feed_start_time_idx"
  ON "battles" ("start_time" DESC NULLS LAST, "created_at" DESC)
  WHERE "total_fame" IS NOT NULL
    AND "total_kills" IS NOT NULL
    AND "total_players" >= 10;
