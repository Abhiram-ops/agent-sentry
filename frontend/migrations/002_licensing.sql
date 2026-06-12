-- AgentSentry dual-tier (Free/Pro) licensing.
-- Extends the users table from 001_credits_schema.sql with activation state
-- the Python CLI validates against via /api/cli/activate.
--
-- Run AFTER 001_credits_schema.sql.

ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(10) NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_code VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_cli_activated BOOLEAN NOT NULL DEFAULT FALSE;

-- tier may only ever be 'free' or 'pro'.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_tier_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_tier_check CHECK (tier IN ('free', 'pro'));
  END IF;
END$$;

-- activation_code is the secret the CLI presents; it must be globally unique.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_activation_code_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_activation_code_key UNIQUE (activation_code);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_users_activation_code ON users(activation_code);
