import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!publicationId || !apiKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        email, reactivate_existing: false, send_welcome_email: false,
        utm_source: "website", utm_medium: "form",
      }),
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
      const transporter = nodemailer.createTransport({
        service: "gmail", auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: `"Blast Radius" <${gmailUser}>`,
        to: email,
        subject: "Welcome to Blast Radius",
        text: `Hey, thanks for subscribing to Blast Radius by AgentSentry.\n\nEach issue covers real NHI and AI agent security incidents — what broke, why it matters, and how to stop it.\n\nCheck out AgentSentry: https://agent-sentry-beta.vercel.app\n\n— Abhiram`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#ffffff;color:#333">
<p style="font-size:20px;font-weight:bold;margin:0 0 4px">Blast Radius</p>
<p style="font-size:12px;color:#888;margin:0 0 28px">by AgentSentry</p>
<h2 style="font-size:20px;margin:0 0 16px;color:#111">You're subscribed.</h2>
<p style="font-size:15px;line-height:1.7;color:#555;margin:0 0 16px">Thanks for signing up. Each issue covers real NHI and AI agent security incidents — what broke, why it matters, and how to stop it.</p>
<p style="font-size:15px;line-height:1.7;color:#555;margin:0 0 28px">Check out <a href="https://agent-sentry-beta.vercel.app" style="color:#16a34a">AgentSentry</a> — the open-source scanner behind this newsletter.</p>
<p style="font-size:12px;color:#aaa;border-top:1px solid #eee;padding-top:16px;margin:0">You received this because you signed up at agent-sentry-beta.vercel.app.</p>
</div>`,
      });
    } catch (e) {
      console.error("[subscribe] Email error:", e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ success: true });
}
