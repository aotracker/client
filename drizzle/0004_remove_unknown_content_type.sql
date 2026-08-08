UPDATE "kill_events" SET "content_type" = 'GROUP' WHERE "content_type"::text = 'UNKNOWN';--> statement-breakpoint
ALTER TABLE "kill_events" ALTER COLUMN "content_type" DROP DEFAULT;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'content_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'UNKNOWN'
  ) THEN
    ALTER TYPE "public"."content_type" RENAME TO "content_type_old";
    CREATE TYPE "public"."content_type" AS ENUM('ZVZ', 'SOLO', 'GROUP');
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'content_type_old'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    ALTER TABLE "kill_events"
      ALTER COLUMN "content_type" TYPE "content_type"
      USING "content_type"::text::"content_type";
    DROP TYPE "public"."content_type_old";
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "kill_events" ALTER COLUMN "content_type" SET DEFAULT 'GROUP';
