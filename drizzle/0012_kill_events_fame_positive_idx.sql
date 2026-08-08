CREATE INDEX IF NOT EXISTS "kill_events_region_occurred_fame_idx"
  ON "kill_events" ("region", "occurred_at" DESC)
  WHERE "total_victim_kill_fame" > 0;
