import { NextResponse } from 'next/server';
import { generateApiKey, touchApiKeyRotation } from '@/lib/db';
import { getSessionUser, regenerateApiKey } from '@/lib/auth';
import { sendApiKeyEmail } from '@/lib/email';

/**
 * Rotates the signed-in user's API key. The key is stored in plaintext (the CLI
 * and Bearer-token billing/usage routes look it up directly), and the new key is
 * both emailed and returned so the dashboard can keep making authorized calls.
 */
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const newKey = generateApiKey();
    await regenerateApiKey(user.id, newKey);
    await touchApiKeyRotation(user.id);
    await sendApiKeyEmail(user.email, newKey);

    return NextResponse.json({
      success: true,
      message: 'A new API key has been generated and emailed to you.',
      api_key: newKey,
      api_key_preview: `${newKey.slice(0, 6)}…${newKey.slice(-6)}`,
    });
  } catch (err) {
    console.error('[/api/user/regenerate-api-key]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
