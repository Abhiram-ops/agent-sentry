-- AgentSentry consent tracking.
-- Records the user's explicit agreement to the Terms of Service and Privacy
-- Policy at two points: web sign-up and CLI activation.
--
-- Run AFTER 002_licensing.sql.
--
-- Data-minimisation note: we store only what is needed to PROVE consent —
-- which document, which version, when, from where (IP), and via which channel.
-- No additional profile data is collected.

-- Current consent state on the user row (fast lookup; latest wins).
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;

-- Append-only audit log of every consent event, for legal defensibility.
CREATE TABLE IF NOT EXISTS consent_events (
  id           SERIAL PRIMARY KEY,
  user_id      INT REFERENCES users(id),
  consent_type VARCHAR(30)  NOT NULL,                       -- 'web_signup' | 'cli_activation'
  document     VARCHAR(40)  NOT NULL DEFAULT 'terms_and_privacy',
  version      VARCHAR(20)  NOT NULL,
  ip           VARCHAR(64),                                 -- evidence of who/when consented
  accepted_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_events_user_id ON consent_events(user_id);
