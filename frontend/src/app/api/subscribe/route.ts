import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string" || !email.includes("@"))
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
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
      await transporter.sendMail({
        from: `"Blast Radius" <${gmailUser}>`,
        to: email,
        subject: "Welcome to Blast Radius",
        text: `Hey, thanks for subscribing to Blast Radius by AgentSentry.\n\nEach issue covers real NHI and AI agent security incidents.\n\nCheck out AgentSentry: https://agent-sentry-beta.vercel.app\n\n— Abhiram`,
      });
    } catch (e) { console.error("[subscribe] Email error:", e instanceof Error ? e.message : e); }
  }
  return NextResponse.json({ success: true });
}
