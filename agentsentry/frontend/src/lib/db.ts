import { sql } from '@vercel/postgres';
import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';

export type Tier = 'free' | 'pro';

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

function mapUser(row: UserRow): User {
  return { ...row, credits_balance: Number(row.credits_balance) };
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
