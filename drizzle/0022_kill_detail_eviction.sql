ALTER TABLE "kill_events" ALTER COLUMN "raw_payload" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "kill_events" ADD COLUMN IF NOT EXISTS "detail_evicted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kill_events_detail_evict_idx" ON "kill_events" ("occurred_at", "detail_evicted_at");--> statement-breakpoint
DROP TABLE IF EXISTS "background_jobs";
