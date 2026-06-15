-- GDPR account-deletion requests, confirmed via emailed link (24h expiry).
-- Run against the Vercel Postgres database before deploying the
-- /api/user/delete and /api/auth/confirm-delete route handlers.
--
-- Note: this is independent of 005_automation_subscription.sql.

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_account_deletion_token ON account_deletion_requests(token);
CREATE INDEX IF NOT EXISTS idx_account_deletion_user_id ON account_deletion_requests(user_id);
