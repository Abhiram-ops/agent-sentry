-- AgentSentry pay-as-you-go credit system schema.
-- Run against the Vercel Postgres database before deploying the credit API routes.
--
-- NOTE: credits_balance / credits_amount are NUMERIC(10,2) rather than INT
-- because the "export" scan action costs 0.5 credits, which an INT column
-- cannot represent.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  credits_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  credits INT,
  price_usd DECIMAL(10, 2),
  stripe_price_id VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(50),
  credits_amount NUMERIC(10, 2),
  cost_usd DECIMAL(10, 2),
  -- UNIQUE (NULL-safe in Postgres) + ON CONFLICT DO NOTHING in addCredits()
  -- is what makes the Stripe webhook idempotent on retried deliveries.
  stripe_transaction_id VARCHAR(255) UNIQUE,
  scan_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);

-- Seed the three purchasable credit packages.
-- Replace the stripe_price_id values with real Stripe (test mode) Price IDs
-- before enabling /api/billing/create-checkout.
INSERT INTO credit_packages (name, credits, price_usd, stripe_price_id) VALUES
  ('Starter', 10,  5.00,  'price_REPLACE_WITH_STRIPE_PRICE_ID_STARTER'),
  ('Growth',  40,  15.00, 'price_REPLACE_WITH_STRIPE_PRICE_ID_GROWTH'),
  ('Scale',   150, 50.00, 'price_REPLACE_WITH_STRIPE_PRICE_ID_SCALE')
ON CONFLICT DO NOTHING;
