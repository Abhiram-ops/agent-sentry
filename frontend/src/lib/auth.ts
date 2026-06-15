import { sql } from '@vercel/postgres';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { getUserById, type User } from '@/lib/db';

/** Name of the HTTP-only cookie holding the server session token. */
export const SESSION_COOKIE = 'agentsentry_session';

const SESSION_TTL_DAYS = 7;
const LOGIN_TOKEN_TTL_HOURS = 24;
const EMAIL_CHANGE_TTL_HOURS = 24;
const ACCOUNT_DELETION_TTL_HOURS = 24;

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

/** Cookie options shared by every place that writes the session cookie. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // 'lax' (not 'strict') so the cookie survives the top-level navigation that
    // follows a magic-link click from an email client; otherwise the post-login
    // redirect to /dashboard would arrive without the cookie and bounce back.
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

/** Generates a 64-character (32-byte) hex token used for sessions and links. */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/** Creates a server session row and returns its token. */
export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  await sql`
    INSERT INTO sessions (user_id, session_token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `;
  return token;
}

/** Reads the session cookie and returns the authenticated user, or null. */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

/** Resolves a user from a raw session token, expiring stale sessions. */
export async function getUserBySessionToken(token: string): Promise<User | null> {
  const { rows } = await sql<{ user_id: number; expires_at: string }>`
    SELECT user_id, expires_at FROM sessions WHERE session_token = ${token}
  `;
  const row = rows[0];
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await sql`DELETE FROM sessions WHERE session_token = ${token}`;
    return null;
  }

  return getUserById(row.user_id);
}

/** Deletes a session row (logout). Safe to call with an unknown token. */
export async function deleteSession(token: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE session_token = ${token}`;
}

export interface LoginTokenRow {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  used_at: string | null;
}

/**
 * Issues a single-use magic-link login token for a user. Returns null when the
 * user has already requested `maxPerHour` tokens within the last hour.
 */
export async function createLoginToken(
  userId: number,
  maxPerHour = 5,
): Promise<string | null> {
  const { rows: recent } = await sql<{ count: string }>`
    SELECT COUNT(*)::text AS count FROM login_tokens
    WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '1 hour'
  `;
  if (Number(recent[0]?.count ?? '0') >= maxPerHour) {
    return null;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_HOURS * 3600 * 1000).toISOString();
  await sql`
    INSERT INTO login_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `;
  return token;
}

/** Looks up a login token row by its token value. */
export async function getLoginToken(token: string): Promise<LoginTokenRow | null> {
  const { rows } = await sql<LoginTokenRow>`
    SELECT id, user_id, token, expires_at, used_at
    FROM login_tokens WHERE token = ${token}
  `;
  return rows[0] ?? null;
}

/** Marks a login token consumed so it can never be replayed. */
export async function markLoginTokenUsed(id: number): Promise<void> {
  await sql`UPDATE login_tokens SET used_at = NOW() WHERE id = ${id}`;
}

/** Records a successful login (verifies email + stamps last_login). */
export async function recordLogin(userId: number): Promise<void> {
  await sql`
    UPDATE users
    SET email_verified = TRUE,
        email_verified_at = COALESCE(email_verified_at, NOW()),
        last_login = NOW(),
        updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export interface PendingEmailChangeRow {
  id: number;
  user_id: number;
  new_email: string;
  verification_token: string;
  expires_at: string;
}

/** Creates a pending email-change request and returns its verification token. */
export async function createEmailChange(userId: number, newEmail: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_HOURS * 3600 * 1000).toISOString();
  // Clear any earlier pending change for this user so only the latest is valid.
  await sql`DELETE FROM pending_email_changes WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO pending_email_changes (user_id, new_email, verification_token, expires_at)
    VALUES (${userId}, ${newEmail.toLowerCase()}, ${token}, ${expiresAt})
  `;
  return token;
}

/** Looks up a pending email-change request by its verification token. */
export async function getEmailChange(token: string): Promise<PendingEmailChangeRow | null> {
  const { rows } = await sql<PendingEmailChangeRow>`
    SELECT id, user_id, new_email, verification_token, expires_at
    FROM pending_email_changes WHERE verification_token = ${token}
  `;
  return rows[0] ?? null;
}

/** Applies a verified email change and clears the pending row. */
export async function applyEmailChange(row: PendingEmailChangeRow): Promise<void> {
  await sql`
    UPDATE users SET email = ${row.new_email}, updated_at = NOW()
    WHERE id = ${row.user_id}
  `;
  await sql`DELETE FROM pending_email_changes WHERE id = ${row.id}`;
}

/** Rotates a user's API key in place and returns the new plaintext key. */
export async function regenerateApiKey(userId: number, newKey: string): Promise<void> {
  await sql`
    UPDATE users SET api_key = ${newKey}, updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export interface AccountDeletionRequestRow {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
}

/** Creates a pending account-deletion request and returns its confirmation token. */
export async function createAccountDeletionRequest(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ACCOUNT_DELETION_TTL_HOURS * 3600 * 1000).toISOString();
  // Clear any earlier pending request so only the latest link is valid.
  await sql`DELETE FROM account_deletion_requests WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO account_deletion_requests (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `;
  return token;
}

/** Looks up a pending account-deletion request by its confirmation token. */
export async function getAccountDeletionRequest(
  token: string,
): Promise<AccountDeletionRequestRow | null> {
  const { rows } = await sql<AccountDeletionRequestRow>`
    SELECT id, user_id, token, expires_at
    FROM account_deletion_requests WHERE token = ${token}
  `;
  return rows[0] ?? null;
}

/**
 * Anonymizes a user's account: replaces the email and API key with
 * non-reversible placeholders, marks the account disabled, and removes all
 * sessions/tokens. Credit transactions are retained (tax record retention).
 */
export async function anonymizeUser(userId: number): Promise<void> {
  const placeholderEmail = `deleted-user-${userId}@agentsentry.invalid`;
  const placeholderKey = generateToken();
  await sql`
    UPDATE users
    SET email = ${placeholderEmail},
        api_key = ${placeholderKey},
        activation_code = NULL,
        disabled_at = NOW(),
        updated_at = NOW()
    WHERE id = ${userId}
  `;
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
  await sql`DELETE FROM login_tokens WHERE user_id = ${userId}`;
  await sql`DELETE FROM pending_email_changes WHERE user_id = ${userId}`;
  await sql`DELETE FROM account_deletion_requests WHERE user_id = ${userId}`;
}
