ALTER TABLE "kill_participants" ADD COLUMN IF NOT EXISTS "guild_albion_id" text;--> statement-breakpoint
ALTER TABLE "kill_participants" ADD COLUMN IF NOT EXISTS "alliance_id" text;--> statement-breakpoint
ALTER TABLE "kill_participants" ADD COLUMN IF NOT EXISTS "alliance_tag" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kill_participants_guild_albion_id_idx" ON "kill_participants" ("guild_albion_id");--> statement-breakpoint
ALTER TABLE "kill_items" DROP CONSTRAINT IF EXISTS "kill_items_participant_id_kill_participants_id_fk";
