ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "detail_sync_unavailable" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "detail_sync_give_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "detail_sync_last_error" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "battles_detail_sync_unavailable_idx" ON "battles" ("detail_sync_unavailable") WHERE "detail_sync_unavailable" = 1;
