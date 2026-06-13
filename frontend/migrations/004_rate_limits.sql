-- Abuse prevention: per-IP rate limiting for unauthenticated POST endpoints
-- (signup, contact). Each allowed request inserts a row; checkRateLimit()
-- (src/lib/rateLimit.ts) counts rows within a sliding window. No cleanup job
-- needed — old rows simply fall outside the window and stop counting.

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45),
  endpoint VARCHAR(255),
  event_type VARCHAR(50),
  occurred_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint ON rate_limit_events(ip_address, endpoint, occurred_at DESC);
