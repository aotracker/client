ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "victim_guild_albion_id" text;--> statement-breakpoint
ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "victim_guild_name" text;
