import { NextRequest, NextResponse } from "next/server";
import { sendPlainEmail } from "@/lib/email";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string" || !isValidEmail(email))
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!publicationId || !apiKey)
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ email, reactivate_existing: false, send_welcome_email: false, utm_source: "website", utm_medium: "form" }),
    }
  );
  if (!res.ok) {
    console.error("[subscribe] Beehiiv error:", res.status);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
  await sendPlainEmail({
    from: "Blast Radius <newsletter@agentsentry.org>",
    to: email,
    subject: "Welcome to Blast Radius",
    text: `Hey, thanks for subscribing to Blast Radius by AgentSentry.\n\nEach issue covers real NHI and AI agent security incidents.\n\nCheck out AgentSentry: https://agent-sentry-beta.vercel.app\n\n— Abhiram`,
  });
  return NextResponse.json({ success: true });
}
