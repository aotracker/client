CREATE TABLE IF NOT EXISTS "guild_hour_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" "region" NOT NULL,
	"guild_albion_id" text NOT NULL,
	"guild_name" text NOT NULL,
	"utc_date" date NOT NULL,
	"utc_hour" integer NOT NULL,
	"content_type" "content_type" NOT NULL,
	"unique_players" integer DEFAULT 0 NOT NULL,
	"kills" integer DEFAULT 0 NOT NULL,
	"deaths" integer DEFAULT 0 NOT NULL,
	"fame" bigint DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guild_hour_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" "region" NOT NULL,
	"guild_albion_id" text NOT NULL,
	"utc_date" date NOT NULL,
	"utc_hour" integer NOT NULL,
	"content_type" "content_type" NOT NULL,
	"player_albion_id" text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "guild_hour_stats_bucket_idx" ON "guild_hour_stats" ("region","guild_albion_id","utc_date","utc_hour","content_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_hour_stats_hour_idx" ON "guild_hour_stats" ("region","utc_hour","utc_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_hour_stats_guild_idx" ON "guild_hour_stats" ("region","guild_albion_id","utc_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "guild_hour_players_bucket_idx" ON "guild_hour_players" ("region","guild_albion_id","utc_date","utc_hour","content_type","player_albion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_hour_players_hour_idx" ON "guild_hour_players" ("region","utc_hour","utc_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_hour_players_guild_idx" ON "guild_hour_players" ("region","guild_albion_id","utc_date");
