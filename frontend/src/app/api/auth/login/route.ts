import { NextRequest, NextResponse } from 'next/server';
import { getUserByApiKey } from '@/lib/db';

interface LoginBody {
  api_key?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginBody;
    const apiKey = body.api_key?.trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'api_key is required.' }, { status: 400 });
    }

    const user = await getUserByApiKey(apiKey);
    if (!user) {
      return NextResponse.json({ error: 'Invalid API key.' }, { status: 401 });
    }

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      credits_balance: user.credits_balance,
    });
  } catch (err) {
    console.error('[/api/auth/login]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
