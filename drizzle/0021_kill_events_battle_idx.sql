CREATE INDEX IF NOT EXISTS "kill_events_battle_id_idx" ON "kill_events" ("battle_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kill_events_region_albion_battle_idx" ON "kill_events" ("region", "albion_battle_id") WHERE "albion_battle_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guilds_alliance_idx" ON "guilds" ("region", "alliance_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "players_alliance_idx" ON "players" ("alliance_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "battles_detail_sync_unavailable_idx" ON "battles" ("detail_sync_unavailable") WHERE "detail_sync_unavailable" = 1;
