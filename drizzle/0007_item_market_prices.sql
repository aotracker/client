CREATE TABLE "item_market_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" "region" NOT NULL,
	"item_id" text NOT NULL,
	"quality" integer NOT NULL,
	"unit_price" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "item_market_prices_region_item_quality_idx" ON "item_market_prices" USING btree ("region","item_id","quality");
--> statement-breakpoint
CREATE INDEX "item_market_prices_updated_at_idx" ON "item_market_prices" USING btree ("updated_at");
