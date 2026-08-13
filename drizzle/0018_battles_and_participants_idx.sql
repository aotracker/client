CREATE INDEX IF NOT EXISTS "battles_region_start_time_idx"
  ON "battles" ("region", "start_time" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "kill_participants_player_idx"
  ON "kill_participants" ("player_id");
