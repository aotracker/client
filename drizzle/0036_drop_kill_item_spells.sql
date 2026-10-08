SET lock_timeout = '5s';
ALTER TABLE "kill_items"
  DROP COLUMN IF EXISTS "spells";
