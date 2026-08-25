CREATE TABLE IF NOT EXISTS "user_claimed_characters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "region" "region" NOT NULL,
  "albion_id" text NOT NULL,
  "claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_claimed_characters"
    ADD CONSTRAINT "user_claimed_characters_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_claimed_characters_region_albion_idx"
  ON "user_claimed_characters" ("region", "albion_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_claimed_characters_user_region_idx"
  ON "user_claimed_characters" ("user_id", "region");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_claimed_characters_user_idx"
  ON "user_claimed_characters" ("user_id");
