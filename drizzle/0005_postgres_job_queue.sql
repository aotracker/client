CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "api_sync_state" ADD COLUMN "circuit_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "api_sync_state" ADD COLUMN "rate_limit_until" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dedupe_key" text NOT NULL,
	"queue" text NOT NULL,
	"name" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "api_request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" "region" NOT NULL,
	"endpoint" text NOT NULL,
	"latency_ms" integer NOT NULL,
	"status" text NOT NULL,
	"error_type" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "background_jobs_status_run_at_idx" ON "background_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "background_jobs_queue_status_idx" ON "background_jobs" USING btree ("queue","status");--> statement-breakpoint
CREATE INDEX "background_jobs_dedupe_key_idx" ON "background_jobs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "background_jobs_dedupe_active_idx" ON "background_jobs" USING btree ("dedupe_key") WHERE "status" IN ('pending', 'processing');--> statement-breakpoint
CREATE INDEX "api_request_logs_region_created_idx" ON "api_request_logs" USING btree ("region","created_at");
