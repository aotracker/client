ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "is_orange_zone" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kill_events_region_occurred_lethal_idx"
  ON "kill_events" ("region", "occurred_at")
  WHERE "total_victim_kill_fame" > 0 AND "is_orange_zone" = false;
