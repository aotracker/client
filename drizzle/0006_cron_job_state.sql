CREATE TABLE "cron_job_state" (
	"job_key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"path" text NOT NULL,
	"schedule" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error_message" text,
	"last_status" text,
	"last_result" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
