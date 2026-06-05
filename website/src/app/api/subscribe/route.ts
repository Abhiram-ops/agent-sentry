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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: "website",
        utm_medium: "form",
      }),
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }

  // Send welcome email directly — Beehiiv free tier doesn't reliably fire welcome emails
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  console.log("[subscribe] GMAIL_USER set:", !!gmailUser, "| GMAIL_PASS set:", !!gmailPass);

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });

      const welcomeHtml = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#080e09;color:#ccc;padding:40px 32px;border-radius:12px;border:1px solid rgba(0,255,136,0.12)">
<div style="color:#00ff88;font-weight:700;font-size:20px;margin-bottom:4px">Blast Radius</div>
<div style="color:#444;font-size:12px;margin-bottom:32px">by AgentSentry</div>
<h2 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 16px">You&apos;re subscribed.</h2>
<p style="font-size:15px;line-height:1.7;color:#aaa;margin:0 0 20px">Thanks for signing up. Each issue of <strong style="color:#fff">Blast Radius</strong> covers real NHI and AI agent security incidents — what broke, why it matters, and how to stop it from happening to you.</p>
<p style="font-size:15px;line-height:1.7;color:#aaa;margin:0 0 32px">In the meantime, check out <a href="https://agent-sentry-beta.vercel.app" style="color:#00ff88;text-decoration:none">AgentSentry</a> — the open-source scanner behind this newsletter.</p>
<div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;font-size:12px;color:#333">You received this because you signed up at agent-sentry-beta.vercel.app.</div>
</div>`;

      await transporter.sendMail({
        from: `"Blast Radius · AgentSentry" <${gmailUser}>`,
        to: email,
        subject: "You're in — welcome to Blast Radius",
        html: welcomeHtml,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[subscribe] Welcome email FAILED:", msg);
    }
  }

  return NextResponse.json({ success: true });
}
