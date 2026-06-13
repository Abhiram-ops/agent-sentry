# AgentSentry Setup & Deployment Guide

This document walks you through the **one-time setup** required to make the credit-based billing system live on Vercel.

**Timeline: 30 minutes** (most of it is waiting for Stripe API calls and Vercel to propagate env vars).

---

## Phase 1: Stripe Setup (10 minutes)

### 1.1 Create Stripe Account

1. Go to [stripe.com/register](https://stripe.com/register)
2. Sign up with your email
3. Go to **Developers** → **API Keys**
4. You'll see:
   - `pk_test_...` (Publishable Key)
   - `sk_test_...` (Secret Key)
5. Copy both — you'll need them in Phase 2

### 1.2 Create Credit Packages (Products)

Still in Stripe Dashboard:

1. Go to **Billing** → **Products**
2. Click **Add product**
3. Create three products:

**Product 1: Starter**
- Name: `Starter Credits`
- Description: `10 credits for $5`
- Price: `$5.00` USD
- Billing period: One-time
- → Copy the **Price ID** (starts with `price_test_...`)

**Product 2: Professional**
- Name: `Professional Credits`
- Description: `40 credits for $15`
- Price: `$15.00` USD
- Billing period: One-time
- → Copy the **Price ID**

**Product 3: Enterprise**
- Name: `Enterprise Credits`
- Description: `150 credits for $50`
- Price: `$50.00` USD
- Billing period: One-time
- → Copy the **Price ID**

Save these Price IDs — you'll use them in Phase 3.

### 1.3 Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://agentsentry.yourdomain.com/api/billing/webhook`
   - (Replace `yourdomain` with your actual domain, e.g., `agentsentry.org`)
4. Events to send: Check only `checkout.session.completed`
5. Click **Add endpoint**
6. You'll see a **Signing Secret** (starts with `whsec_`)
   - Copy this — you'll need it in Phase 2

---

## Phase 2: Vercel Environment Variables (5 minutes)

1. Go to [vercel.com](https://vercel.com) → Your Project
2. Go to **Settings** → **Environment Variables**
3. Add these variables (paste the values from Phase 1):

| Key | Value | Source |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe API Keys |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Webhooks |
| `RESEND_API_KEY` | (already have?) | Resend dashboard |
| `CLAIM_SECRET` | Any random string (32 chars) | Generate yourself |
| `CONTACT_TO_EMAIL` | your@email.com | Your email |
| `AGENTSENTRY_API` | `https://agentsentry.yourdomain.com` | Your domain |

4. Click **Save** for each
5. Wait ~30 seconds for Vercel to redeploy

---

## Phase 3: Run SQL Migrations (5 minutes)

You need to create the three tables in Vercel Postgres. Two ways:

### Option A: Using Vercel's SQL Editor (Easiest)

1. Go to your Vercel project → **Storage** → **Postgres**
2. Click **Query** (opens SQL editor)
3. Paste the SQL below and run:

```sql
-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  credits_balance INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create credit packages
CREATE TABLE credit_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  credits INT,
  price_usd DECIMAL(10, 2),
  stripe_price_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create credit transactions
CREATE TABLE credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50),
  credits_amount INT,
  cost_usd DECIMAL(10, 2),
  stripe_transaction_id VARCHAR(255),
  scan_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_users_api_key ON users(api_key);
CREATE INDEX idx_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_transactions_created ON credit_transactions(created_at);
```

4. Click **Run** and wait for confirmation

### Option B: Using psql (If you have PostgreSQL installed locally)

```bash
# Get connection string from Vercel → Storage → Postgres → .env.local
export DATABASE_URL="postgresql://user:pass@host/db"

psql "$DATABASE_URL" << 'EOF'
[paste the SQL above here]
EOF
```

---

## Phase 4: Seed Credit Packages (5 minutes)

Now populate the `credit_packages` table with the Stripe Price IDs from Phase 1.2.

**In Vercel SQL Editor, run:**

```sql
INSERT INTO credit_packages (name, credits, price_usd, stripe_price_id) VALUES
  ('Starter', 10, 5.00, 'price_test_xxxxx'),
  ('Professional', 40, 15.00, 'price_test_yyyyy'),
  ('Enterprise', 150, 50.00, 'price_test_zzzzz');
```

**Replace `price_test_xxxxx`, `price_test_yyyyy`, `price_test_zzzzz` with your actual Stripe Price IDs from Phase 1.2.**

Verify:
```sql
SELECT * FROM credit_packages;
```

You should see 3 rows with your Price IDs.

---

## Phase 5: Test the Flow (5 minutes)

### 5.1 Test Signup

```bash
curl -X POST https://agentsentry.yourdomain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response:
```json
{
  "api_key": "as_test_xxxxx",
  "user_id": 1,
  "credits": 0
}
```

Check Vercel Postgres:
```sql
SELECT * FROM users WHERE email = 'test@example.com';
```

### 5.2 Test Get Credits

```bash
curl -X GET https://agentsentry.yourdomain.com/api/user/credits \
  -H "Authorization: Bearer as_test_xxxxx"
```

Expected:
```json
{
  "credits_balance": 0,
  "email": "test@example.com",
  "created_at": "2024-06-12T..."
}
```

### 5.3 Test Credit Deduction

```bash
curl -X POST https://agentsentry.yourdomain.com/api/usage/deduct \
  -H "Authorization: Bearer as_test_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"action":"scan_local","credits_required":1}'
```

Expected:
```json
{
  "success": true,
  "remaining_credits": -1
}
```

(Negative means they're out of credits — this is expected before buying.)

### 5.4 Test Stripe Checkout

```bash
curl -X POST https://agentsentry.yourdomain.com/api/billing/create-checkout \
  -H "Authorization: Bearer as_test_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"package_id":1}'
```

Expected:
```json
{
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_xxxxx"
}
```

Visit that URL in a browser. You should see the Stripe checkout form.

### 5.5 Test Stripe Webhook (Simulated)

In Stripe Dashboard → **Developers** → **Webhooks** → Click your endpoint → **Send test event** → Choose `checkout.session.completed` → Send.

Then check Vercel logs:
```
POST /api/billing/webhook → 200 OK
```

And verify credits were added:
```sql
SELECT * FROM credit_transactions WHERE user_id = 1;
```

---

## Phase 6: Deploy (0 minutes — automatic)

Once all tests pass:

```powershell
cd C:\Users\abhir\Documents\Claude\Projects\Agent-Sentry
git add frontend
git commit -m "feat: wire billing and migrations for production"
git push origin master
```

Vercel auto-deploys. Check:
1. [vercel.com](https://vercel.com) → Deployments → Latest is `✓ Ready`
2. Visit `https://agentsentry.yourdomain.com` → should load
3. Visit `https://agentsentry.yourdomain.com/dashboard` → should show credits (error if you're not logged in, which is fine)

---

## Troubleshooting

### "Cannot find module 'stripe'"
```bash
cd frontend && npm install stripe
```

### "STRIPE_SECRET_KEY is undefined"
- Did you add it to Vercel env vars?
- Wait 30 seconds after saving
- Redeploy manually: Vercel Dashboard → Project → **Deployments** → **Redeploy**

### "Webhook signature verification failed"
- Check that `STRIPE_WEBHOOK_SECRET` matches **exactly** (copy from Stripe, no extra spaces)

### "Cannot find table 'users'"
- Did you run the SQL migrations in Phase 3?
- Check Vercel Postgres → **Query** → `SELECT * FROM information_schema.tables;`

### "Stripe checkout returns 'No such product'"
- Did you paste the correct `stripe_price_id` in Phase 4?
- Run `SELECT * FROM credit_packages;` and verify the IDs

---

## Monitoring (After Launch)

### Daily:
- Check Vercel Logs: any 5xx errors? (`/api/usage/deduct`, `/api/billing/webhook`)
- Check Stripe Dashboard: any failed charges?

### Weekly:
- SQL query to see new signups:
  ```sql
  SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days';
  ```
- Revenue:
  ```sql
  SELECT SUM(cost_usd) FROM credit_transactions WHERE action = 'purchase' AND created_at > NOW() - INTERVAL '7 days';
  ```

---

## Next Steps (After Verified)

1. **Update CLI** to use the `/api/user/credits` and `/api/usage/deduct` endpoints
2. **Add email confirmation** for signup (optional but recommended)
3. **Set up alerts** in Stripe for failed payments
4. **Test with real Stripe account** (switch from `sk_test_` to `sk_live_`)

---

## Questions?

If something fails:
- Check Vercel Logs (Deployments → View Log)
- Check Stripe Dashboard → Events (scroll for errors)
- Run `npm run build` locally and look for TypeScript errors

Good luck! 🚀
