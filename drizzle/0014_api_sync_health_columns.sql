ALTER TABLE api_sync_state ADD COLUMN IF NOT EXISTS last_ingest_at timestamptz;
ALTER TABLE api_sync_state ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz;
ALTER TABLE api_sync_state ADD COLUMN IF NOT EXISTS last_health_check_ok integer DEFAULT 0;

UPDATE api_sync_state
SET last_ingest_at = last_success_at
WHERE last_ingest_at IS NULL
  AND last_success_at IS NOT NULL;
