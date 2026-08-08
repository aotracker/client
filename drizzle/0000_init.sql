CREATE TYPE "public"."content_type" AS ENUM('ZVZ', 'SOLO', 'GROUP', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."item_category" AS ENUM('equipment', 'inventory');--> statement-breakpoint
CREATE TYPE "public"."owner_role" AS ENUM('killer', 'victim', 'group_member', 'participant');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('americas', 'europe', 'asia');--> statement-breakpoint
CREATE TABLE "alliances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"albion_id" text NOT NULL,
	"region" "region" NOT NULL,
	"name" text NOT NULL,
	"tag" text,
	"member_count" integer,
	"founder_id" text,
	"founder_name" text,
	"founded" text,
	"guilds_json" jsonb,
	"raw_payload" jsonb,
	"last_synced_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_sync_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" "region" NOT NULL,
	"last_seen_event_id" bigint,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error_message" text,
	"consecutive_failures" integer DEFAULT 0,
	"circuit_open" integer DEFAULT 0,
	"avg_latency_ms" integer DEFAULT 0,
	"events_ingested_last_hour" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_sync_state_region_unique" UNIQUE("region")
);
--> statement-breakpoint
CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"albion_battle_id" bigint NOT NULL,
	"region" "region" NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"total_fame" bigint,
	"total_kills" integer,
	"total_players" integer,
	"raw_payload" jsonb,
	"events_payload" jsonb,
	"detail_payload" jsonb,
	"detail_synced_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"albion_id" text NOT NULL,
	"region" "region" NOT NULL,
	"name" text NOT NULL,
	"alliance_id" text,
	"alliance_name" text,
	"alliance_tag" text,
	"kill_fame" bigint DEFAULT 0,
	"death_fame" bigint DEFAULT 0,
	"member_count" integer,
	"raw_payload" jsonb,
	"last_synced_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"history_last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kill_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" bigint NOT NULL,
	"region" "region" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"content_type" "content_type" DEFAULT 'UNKNOWN' NOT NULL,
	"battle_id" uuid,
	"albion_battle_id" bigint,
	"killer_id" uuid,
	"victim_id" uuid,
	"total_victim_kill_fame" bigint,
	"participant_count" integer,
	"group_member_count" integer,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kill_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"participant_id" uuid,
	"owner_role" "owner_role" NOT NULL,
	"category" "item_category" NOT NULL,
	"slot" text,
	"item_type" text NOT NULL,
	"quality" integer DEFAULT 0,
	"count" integer DEFAULT 1,
	"spells" jsonb
);
--> statement-breakpoint
CREATE TABLE "kill_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"player_id" uuid,
	"role" "owner_role" NOT NULL,
	"name" text,
	"guild_name" text,
	"average_item_power" numeric(10, 2),
	"kill_fame" bigint,
	"death_fame" bigint,
	"support_healing_done" bigint,
	"raw_payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"albion_id" text NOT NULL,
	"region" "region" NOT NULL,
	"name" text NOT NULL,
	"guild_id" uuid,
	"alliance_id" text,
	"alliance_name" text,
	"avatar" text,
	"avatar_ring" text,
	"kill_fame" bigint DEFAULT 0,
	"death_fame" bigint DEFAULT 0,
	"fame_ratio" numeric(10, 4),
	"lifetime_stats" jsonb,
	"last_synced_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"history_last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kill_events" ADD CONSTRAINT "kill_events_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kill_events" ADD CONSTRAINT "kill_events_killer_id_players_id_fk" FOREIGN KEY ("killer_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kill_events" ADD CONSTRAINT "kill_events_victim_id_players_id_fk" FOREIGN KEY ("victim_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kill_items" ADD CONSTRAINT "kill_items_event_id_kill_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."kill_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kill_items" ADD CONSTRAINT "kill_items_participant_id_kill_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."kill_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kill_participants" ADD CONSTRAINT "kill_participants_event_id_kill_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."kill_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kill_participants" ADD CONSTRAINT "kill_participants_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alliances_albion_region_idx" ON "alliances" USING btree ("albion_id","region");--> statement-breakpoint
CREATE INDEX "alliances_name_idx" ON "alliances" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "battles_albion_region_idx" ON "battles" USING btree ("albion_battle_id","region");--> statement-breakpoint
CREATE UNIQUE INDEX "guilds_albion_region_idx" ON "guilds" USING btree ("albion_id","region");--> statement-breakpoint
CREATE INDEX "guilds_name_idx" ON "guilds" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "kill_events_event_region_idx" ON "kill_events" USING btree ("event_id","region");--> statement-breakpoint
CREATE INDEX "kill_events_occurred_idx" ON "kill_events" USING btree ("region","occurred_at");--> statement-breakpoint
CREATE INDEX "kill_events_killer_idx" ON "kill_events" USING btree ("killer_id","occurred_at");--> statement-breakpoint
CREATE INDEX "kill_events_victim_idx" ON "kill_events" USING btree ("victim_id","occurred_at");--> statement-breakpoint
CREATE INDEX "kill_events_content_idx" ON "kill_events" USING btree ("content_type","occurred_at");--> statement-breakpoint
CREATE INDEX "kill_items_event_idx" ON "kill_items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "kill_participants_event_idx" ON "kill_participants" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "players_albion_region_idx" ON "players" USING btree ("albion_id","region");--> statement-breakpoint
CREATE INDEX "players_name_idx" ON "players" USING btree ("name");--> statement-breakpoint
CREATE INDEX "players_guild_idx" ON "players" USING btree ("guild_id");
