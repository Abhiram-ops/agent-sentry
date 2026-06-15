import { sql } from '@vercel/postgres';
import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';

export type Tier = 'free' | 'pro';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled';

export interface User {
  id: number;
  email: string;
  api_key: string;
  credits_balance: number;
  tier: Tier;
  activation_code: string | null;
  is_cli_activated: boolean;
  created_at: string;
  updated_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_current_period_end: string | null;
  api_key_rotated_at: string;
  api_key_reminder_sent_at: string | null;
}

export interface CreditPackage {
  id: number;
  name: string;
  credits: number;
  price_usd: number;
  stripe_price_id: string;
}

export interface CreditTransaction {
  id: number;
  user_id: number;
  action: string;
  credits_amount: number;
  cost_usd: number | null;
  stripe_transaction_id: string | null;
  scan_metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UserRow {
  id: number;
  email: string;
  api_key: string;
  credits_balance: string;
  tier: Tier;
  activation_code: string | null;
  is_cli_activated: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Automation-subscription columns (migration 005) are queried separately via
 * `mapUser` defaults until that migration has been applied in production —
 * see [[agentsentry-db-migration-005]]. Keeping them out of the core
 * SELECT/RETURNING lists below avoids breaking login/signup/session lookups
 * ("column does not exist") on databases that predate the migration.
 */
interface AutomationUserRow {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_current_period_end: string | null;
  api_key_rotated_at: string;
  api_key_reminder_sent_at: string | null;
}

interface CreditPackageRow {
  id: number;
  name: string;
  credits: number;
  price_usd: string;
  stripe_price_id: string;
}

interface CreditTransactionRow {
  id: number;
  user_id: number;
  action: string;
  credits_amount: string;
  cost_usd: string | null;
  stripe_transaction_id: string | null;
  scan_metadata: Record<string, unknown> | null;
  created_at: string;
}

const AUTOMATION_USER_DEFAULTS: AutomationUserRow = {
  stripe_customer_id: null,
  stripe_subscription_id: null,
  subscription_status: 'none',
  subscription_current_period_end: null,
  api_key_rotated_at: new Date(0).toISOString(),
  api_key_reminder_sent_at: null,
};

function mapUser(row: UserRow, automation: Partial<AutomationUserRow> = {}): User {
  return {
    ...row,
    credits_balance: Number(row.credits_balance),
    ...AUTOMATION_USER_DEFAULTS,
    ...automation,
  };
}

/** Generates a tier-prefixed activation code, e.g. AS-FREE-1A2B-3C4D-5E6F-7A8B. */
export function generateActivationCode(tier: Tier): string {
  const prefix = tier === 'pro' ? 'AS-PRO' : 'AS-FREE';
  const hex = randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function mapCreditPackage(row: CreditPackageRow): CreditPackage {
  return { ...row, price_usd: Number(row.price_usd) };
}

function mapCreditTransaction(row: CreditTransactionRow): CreditTransaction {
  return {
    ...row,
    credits_amount: Number(row.credits_amount),
    cost_usd: row.cost_usd === null ? null : Number(row.cost_usd),
  };
}

/** Generates a 64-character hex API key (32 bytes of entropy). */
export function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

export async function createUser(email: string): Promise<User> {
  const apiKey = generateApiKey();
  const activationCode = generateActivationCode('free');
  const { rows } = await sql<UserRow>`
    INSERT INTO users (email, api_key, credits_balance, tier, activation_code, is_cli_activated)
    VALUES (${email.toLowerCase()}, ${apiKey}, 0, 'free', ${activationCode}, FALSE)
    RETURNING id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at
  `;
  return mapUser(rows[0]);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { rows } = await sql<UserRow>`
    SELECT id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at
    FROM users WHERE email = ${email.toLowerCase()}
  `;
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function getUserByApiKey(apiKey: string): Promise<User | null> {
  const { rows } = await sql<UserRow>`
    SELECT id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at
    FROM users WHERE api_key = ${apiKey}
  `;
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function getUserById(id: number): Promise<User | null> {
  const { rows } = await sql<UserRow>`
    SELECT id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at
    FROM users WHERE id = ${id}
  `;
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function getUserByActivationCode(code: string): Promise<User | null> {
  const { rows } = await sql<UserRow>`
    SELECT id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at
    FROM users WHERE activation_code = ${code}
  `;
  return rows[0] ? mapUser(rows[0]) : null;
}

/** Marks a user's CLI as activated. Returns whether this was the first activation. */
export async function markCliActivated(userId: number): Promise<boolean> {
  const { rows } = await sql<{ is_cli_activated: boolean }>`
    UPDATE users
    SET is_cli_activated = TRUE, updated_at = NOW()
    WHERE id = ${userId} AND is_cli_activated = FALSE
    RETURNING is_cli_activated
  `;
  return rows.length > 0;
}

/** Promotes a user to Pro and issues a fresh AS-PRO activation code. */
export async function upgradeUserToPro(userId: number): Promise<User | null> {
  const proCode = generateActivationCode('pro');
  const { rows } = await sql<UserRow>`
    UPDATE users
    SET tier = 'pro', activation_code = ${proCode}, is_cli_activated = FALSE, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at
  `;
  return rows[0] ? mapUser(rows[0]) : null;
}

/** Resolves the authenticated user from a `Authorization: Bearer <api_key>` header. */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const apiKey = authHeader.slice('Bearer '.length).trim();
  if (!apiKey) return null;

  return getUserByApiKey(apiKey);
}

export interface DeductResult {
  success: boolean;
  remaining_credits: number;
}

/**
 * Atomically deducts `amount` credits if the user has sufficient balance,
 * logging a credit_transactions row for the deduction. Returns
 * `success: false` (without modifying the balance) if funds are insufficient.
 */
export async function deductCredits(
  userId: number,
  amount: number,
  action: string,
  metadata: Record<string, unknown> | null = null,
): Promise<DeductResult> {
  const { rows } = await sql<{ credits_balance: string }>`
    UPDATE users
    SET credits_balance = credits_balance - ${amount}, updated_at = NOW()
    WHERE id = ${userId} AND credits_balance >= ${amount}
    RETURNING credits_balance
  `;

  if (rows.length === 0) {
    const current = await getUserById(userId);
    return { success: false, remaining_credits: current?.credits_balance ?? 0 };
  }

  await sql`
    INSERT INTO credit_transactions (user_id, action, credits_amount, scan_metadata)
    VALUES (
      ${userId},
      ${action},
      ${-amount},
      ${metadata === null ? null : JSON.stringify(metadata)}::jsonb
    )
  `;

  return { success: true, remaining_credits: Number(rows[0].credits_balance) };
}

export interface AddCreditsResult {
  alreadyProcessed: boolean;
  user: User | null;
}

/**
 * Credits a user's balance for a Stripe purchase and logs the transaction.
 * Idempotent: if `stripeTransactionId` was already recorded, the balance is
 * left untouched and `alreadyProcessed: true` is returned.
 */
export async function addCredits(
  userId: number,
  amount: number,
  costUsd: number,
  stripeTransactionId: string,
): Promise<AddCreditsResult> {
  const inserted = await sql<{ id: number }>`
    INSERT INTO credit_transactions (user_id, action, credits_amount, cost_usd, stripe_transaction_id)
    VALUES (${userId}, 'purchase', ${amount}, ${costUsd}, ${stripeTransactionId})
    ON CONFLICT (stripe_transaction_id) DO NOTHING
    RETURNING id
  `;

  if (inserted.rows.length === 0) {
    return { alreadyProcessed: true, user: null };
  }

  const { rows } = await sql<UserRow>`
    UPDATE users
    SET credits_balance = credits_balance + ${amount}, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at
  `;

  return { alreadyProcessed: false, user: rows[0] ? mapUser(rows[0]) : null };
}

export async function getCreditPackageById(id: number): Promise<CreditPackage | null> {
  const { rows } = await sql<CreditPackageRow>`
    SELECT id, name, credits, price_usd, stripe_price_id
    FROM credit_packages WHERE id = ${id}
  `;
  return rows[0] ? mapCreditPackage(rows[0]) : null;
}

export async function getCreditPackages(): Promise<CreditPackage[]> {
  const { rows } = await sql<CreditPackageRow>`
    SELECT id, name, credits, price_usd, stripe_price_id
    FROM credit_packages ORDER BY price_usd ASC
  `;
  return rows.map(mapCreditPackage);
}

export async function getTransactionHistory(userId: number, limit = 50): Promise<CreditTransaction[]> {
  const { rows } = await sql<CreditTransactionRow>`
    SELECT id, user_id, action, credits_amount, cost_usd, stripe_transaction_id, scan_metadata, created_at
    FROM credit_transactions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(mapCreditTransaction);
}

// ---------------------------------------------------------------------------
// Automation subscription (Stripe recurring "Automation" add-on)
// ---------------------------------------------------------------------------

/** Looks up a user by their Stripe subscription ID (used by the billing webhook). */
export async function getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | null> {
  const { rows } = await sql<UserRow & AutomationUserRow>`
    SELECT id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at,
           stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end,
           api_key_rotated_at, api_key_reminder_sent_at
    FROM users WHERE stripe_subscription_id = ${subscriptionId}
  `;
  return rows[0] ? mapUser(rows[0], rows[0]) : null;
}

/** Records a newly-created Automation subscription (Stripe Checkout `checkout.session.completed`). */
export async function setSubscriptionActive(
  userId: number,
  customerId: string,
  subscriptionId: string,
  currentPeriodEnd: Date,
): Promise<User | null> {
  const { rows } = await sql<UserRow & AutomationUserRow>`
    UPDATE users
    SET stripe_customer_id = ${customerId},
        stripe_subscription_id = ${subscriptionId},
        subscription_status = 'active',
        subscription_current_period_end = ${currentPeriodEnd.toISOString()},
        updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at,
              stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end,
              api_key_rotated_at, api_key_reminder_sent_at
  `;
  return rows[0] ? mapUser(rows[0], rows[0]) : null;
}

/** Applies a `customer.subscription.updated`/`deleted` event from the billing webhook. */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  currentPeriodEnd: Date | null,
): Promise<User | null> {
  const { rows } = await sql<UserRow & AutomationUserRow>`
    UPDATE users
    SET subscription_status = ${status},
        subscription_current_period_end = ${currentPeriodEnd ? currentPeriodEnd.toISOString() : null},
        updated_at = NOW()
    WHERE stripe_subscription_id = ${subscriptionId}
    RETURNING id, email, api_key, credits_balance, tier, activation_code, is_cli_activated, created_at, updated_at,
              stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end,
              api_key_rotated_at, api_key_reminder_sent_at
  `;
  return rows[0] ? mapUser(rows[0], rows[0]) : null;
}

/** Resets the API-key rotation clock — called after a key is regenerated. */
export async function touchApiKeyRotation(userId: number): Promise<void> {
  await sql`
    UPDATE users
    SET api_key_rotated_at = NOW(), api_key_reminder_sent_at = NULL, updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export interface RotationReminderUser {
  id: number;
  email: string;
}

/** Active-subscription users whose API key is 90+ days old and haven't been reminded recently. */
export async function getUsersDueForRotationReminder(): Promise<RotationReminderUser[]> {
  const { rows } = await sql<RotationReminderUser>`
    SELECT id, email FROM users
    WHERE subscription_status = 'active'
      AND api_key_rotated_at < NOW() - INTERVAL '90 days'
      AND (api_key_reminder_sent_at IS NULL OR api_key_reminder_sent_at < NOW() - INTERVAL '90 days')
  `;
  return rows;
}

/** Marks that a rotation-reminder email was just sent, so it isn't repeated for 90 days. */
export async function markRotationReminderSent(userId: number): Promise<void> {
  await sql`UPDATE users SET api_key_reminder_sent_at = NOW() WHERE id = ${userId}`;
}

// ---------------------------------------------------------------------------
// Scan reports (uploaded by `agentsentry _run-scheduled` when --notify-email)
// ---------------------------------------------------------------------------

export interface ScanReportSummary {
  schedule_id: string;
  target: string;
  scan_timestamp: string;
  new_nhis: Array<{ id: string; name: string; risk_score: number; risk_level: string; suggestion: string }>;
  newly_zombie: Array<{ id: string; name: string; days_since_use: number | null }>;
  rotation_due: Array<{ id: string; name: string; days_since_rotation: number | null }>;
}

export interface ScanReport {
  id: number;
  user_id: number;
  schedule_id: string;
  target: string;
  new_nhi_count: number;
  new_zombie_count: number;
  rotation_due_count: number;
  summary: ScanReportSummary;
  created_at: string;
}

interface ScanReportRow {
  id: number;
  user_id: number;
  schedule_id: string;
  target: string;
  new_nhi_count: number;
  new_zombie_count: number;
  rotation_due_count: number;
  summary: ScanReportSummary;
  created_at: string;
}

/** Persists a scan-report summary uploaded by the CLI's scheduled-scan runner. */
export async function insertScanReport(
  userId: number,
  summary: ScanReportSummary,
): Promise<ScanReport> {
  const { rows } = await sql<ScanReportRow>`
    INSERT INTO scan_reports (user_id, schedule_id, target, new_nhi_count, new_zombie_count, rotation_due_count, summary)
    VALUES (
      ${userId},
      ${summary.schedule_id},
      ${summary.target},
      ${summary.new_nhis.length},
      ${summary.newly_zombie.length},
      ${summary.rotation_due.length},
      ${JSON.stringify(summary)}::jsonb
    )
    RETURNING id, user_id, schedule_id, target, new_nhi_count, new_zombie_count, rotation_due_count, summary, created_at
  `;
  return rows[0];
}

/** Returns the most recent scan reports for a user (newest first). */
export async function getScanReports(userId: number, limit = 20): Promise<ScanReport[]> {
  const { rows } = await sql<ScanReportRow>`
    SELECT id, user_id, schedule_id, target, new_nhi_count, new_zombie_count, rotation_due_count, summary, created_at
    FROM scan_reports
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}
