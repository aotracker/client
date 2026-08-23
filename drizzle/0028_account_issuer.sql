-- Better Auth 1.7+: account identity is scoped by (issuer, account_id).
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;
--> statement-breakpoint
UPDATE "account"
SET "issuer" = 'local:oauth:' || "provider_id"
WHERE "issuer" IS NULL OR "issuer" = '';
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_account_id_uidx"
  ON "account" USING btree ("issuer","account_id");
