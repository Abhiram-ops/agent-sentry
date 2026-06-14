-- Automation subscription: recurring "Automation" add-on ($9/mo, requires Pro)
-- that gates the CLI's local scheduled-scan feature. Adds Stripe subscription
-- bookkeeping + AgentSentry API-key rotation tracking to users, and a table
-- for scan-report summaries the CLI uploads when notify_email is enabled.
--
-- Run AFTER 004_rate_limits.sql, against the Vercel Postgres database.

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) NOT NULL DEFAULT 'none'
  CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_rotated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_reminder_sent_at TIMESTAMP;

-- Scan-report summaries uploaded by the CLI's scheduled-scan runner
-- (`agentsentry _run-scheduled`) when --notify-email is enabled.
CREATE TABLE IF NOT EXISTS scan_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schedule_id VARCHAR(64) NOT NULL,
  target VARCHAR(20) NOT NULL,
  new_nhi_count INTEGER NOT NULL DEFAULT 0,
  new_zombie_count INTEGER NOT NULL DEFAULT 0,
  rotation_due_count INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scan_reports_user ON scan_reports(user_id, created_at DESC);
