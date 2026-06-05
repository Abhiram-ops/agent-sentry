import { NextRequest, NextResponse } from "next/server";

const SENDER_EMAIL = "agentsentry.tool@gmail.com";

async function sendBrevoEmail(opts: {
  from: string; to: string; replyTo?: string; subject: string; htmlContent: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) { console.error("[brevo] BREVO_API_KEY not set"); return; }

  const body: Record<string, unknown> = {
    sender: { name: "AgentSentry", email: SENDER_EMAIL },
    to: [{ email: opts.to }],
    subject: opts.subject,
    htmlContent: opts.htmlContent,
  };
  if (opts.replyTo) body.replyTo = { email: opts.replyTo };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[brevo] Send failed:", res.status, err.slice(0, 300));
    throw new Error(`Brevo ${res.status}`);
  }
}

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

  if (!name || !email || !message)
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  if (!email.includes("@"))
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });

  try {
    await sendBrevoEmail({
      from: SENDER_EMAIL, to: SENDER_EMAIL, replyTo: email,
      subject: `[Contact] ${name} — AgentSentry`,
      htmlContent: `<div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;max-width:600px">
<h2 style="color:#00ff88;margin-top:0">New contact form submission</h2>
<table style="width:100%;border-collapse:collapse">
<tr><td style="color:#888;padding:6px 0;width:80px">Name</td><td style="color:#fff">${name}</td></tr>
<tr><td style="color:#888;padding:6px 0">Email</td><td><a href="mailto:${email}" style="color:#00ff88">${email}</a></td></tr>
</table>
<hr style="border-color:#222;margin:16px 0"/>
<p style="color:#888;margin-bottom:8px">Message</p>
<p style="color:#fff;line-height:1.6;white-space:pre-wrap">${message}</p>
</div>`,
    });

    await sendBrevoEmail({
      from: SENDER_EMAIL, to: email,
      subject: "Got your message — AgentSentry",
      htmlContent: `<div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:32px;border-radius:8px;max-width:600px">
<h2 style="color:#fff;margin-top:0">Hey ${name}, we got your message.</h2>
<p style="color:#888;line-height:1.7">Thanks for reaching out. I read every message and typically reply within 24–48 hours. For bugs, feel free to also open a <a href="https://github.com/Abhiram-ops/agent-sentry/issues/new" style="color:#00ff88">GitHub issue</a>.</p>
<p style="color:#888;line-height:1.7">— Abhiram<br/><span style="color:#555">Builder, AgentSentry</span></p>
<hr style="border-color:#1a1a1a;margin:24px 0"/>
<p style="color:#444;font-size:12px;margin:0">This is an automated confirmation. Your message was received at agentsentry.tool@gmail.com.</p>
</div>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] Email error:", err);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
