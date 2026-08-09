ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "detail_evicted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "battles_detail_evict_idx" ON "battles" ("end_time", "detail_evicted_at");
