ALTER TABLE "discord_feeds"
  ADD COLUMN IF NOT EXISTS "delivery_status" text NOT NULL DEFAULT 'healthy';
--> statement-breakpoint
ALTER TABLE "discord_feeds"
  ADD COLUMN IF NOT EXISTS "delivery_error_code" text;
--> statement-breakpoint
ALTER TABLE "discord_feeds"
  ADD COLUMN IF NOT EXISTS "delivery_error_message" text;
--> statement-breakpoint
ALTER TABLE "discord_feeds"
  ADD COLUMN IF NOT EXISTS "delivery_error_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "discord_feeds" AS f
SET
  "delivery_status" = 'disabled',
  "delivery_error_code" = 'GUILD_LEFT',
  "delivery_error_message" = 'The AOTracker bot is no longer in this Discord server.',
  "delivery_error_at" = COALESCE("delivery_error_at", now()),
  "updated_at" = now()
FROM "discord_servers" AS s
WHERE f."discord_guild_id" = s."discord_guild_id"
  AND s."left_at" IS NOT NULL
  AND f."delivery_status" = 'healthy';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discord_feeds_delivery_status_idx"
  ON "discord_feeds" ("delivery_status")
  WHERE "delivery_status" <> 'healthy';
