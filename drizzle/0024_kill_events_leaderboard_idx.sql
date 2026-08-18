CREATE INDEX IF NOT EXISTS "kill_events_lb_killer_idx"
  ON "kill_events" ("occurred_at" DESC, "killer_id")
  INCLUDE ("total_victim_kill_fame", "region", "content_type")
  WHERE "total_victim_kill_fame" > 0 AND "killer_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kill_events_lb_fame_idx"
  ON "kill_events" ("total_victim_kill_fame" DESC, "occurred_at")
  WHERE "total_victim_kill_fame" > 0;
