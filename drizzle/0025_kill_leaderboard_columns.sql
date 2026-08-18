ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "killer_guild_albion_id" text;--> statement-breakpoint
ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "killer_guild_name" text;--> statement-breakpoint
ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "killer_alliance_albion_id" text;--> statement-breakpoint
ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "killer_alliance_name" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kill_events_lb_guild_idx"
  ON "kill_events" ("occurred_at" DESC, "killer_guild_albion_id", "region")
  INCLUDE ("total_victim_kill_fame", "killer_guild_name", "content_type")
  WHERE "total_victim_kill_fame" > 0 AND "killer_guild_albion_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kill_events_lb_alliance_idx"
  ON "kill_events" ("occurred_at" DESC, "killer_alliance_albion_id", "region")
  INCLUDE ("total_victim_kill_fame", "killer_alliance_name", "content_type")
  WHERE "total_victim_kill_fame" > 0 AND "killer_alliance_albion_id" IS NOT NULL;
