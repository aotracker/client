ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "loot_est_silver" bigint;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kill_events_juicy_occurred_idx"
  ON "kill_events" ("occurred_at", "event_id")
  WHERE "total_victim_kill_fame" > 0 AND "loot_est_silver" >= 20000000;
