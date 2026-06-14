import { sql } from '@vercel/postgres';

/** Extracts the client IP from a possibly comma-separated X-Forwarded-For value. */
function normalizeIp(raw: string): string {
  return raw.split(',')[0].trim().slice(0, 45) || 'unknown';
}

/**
 * Returns true if `ip` may make another request to `endpoint`, false if it has
 * already made `maxRequests` within the last `windowMinutes`. Allowed requests
 * are recorded immediately, so the stored count includes this call.
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number,
): Promise<boolean> {
  const ipAddress = normalizeIp(ip);

  const { rows } = await sql<{ count: string }>`
    SELECT COUNT(*)::text AS count FROM rate_limit_events
    WHERE ip_address = ${ipAddress} AND endpoint = ${endpoint}
      AND occurred_at > NOW() - INTERVAL '1 minute' * ${windowMinutes}
  `;

  if (Number(rows[0]?.count ?? '0') >= maxRequests) {
    return false;
  }

  await sql`
    INSERT INTO rate_limit_events (ip_address, endpoint, event_type)
    VALUES (${ipAddress}, ${endpoint}, 'request')
  `;
  return true;
}
