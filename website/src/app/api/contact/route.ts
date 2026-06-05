import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const brevoLogin = process.env.BREVO_LOGIN;
  const brevoKey = process.env.BREVO_SMTP_KEY;
  const SENDER = "agentsentry.tool@gmail.com";

  if (!brevoLogin || !brevoKey) {
    console.error("Brevo credentials not configured");
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: { user: brevoLogin, pass: brevoKey },
  });

  try {
    // 1. Forward submission to agentsentry inbox
    await transporter.sendMail({
      from: `"AgentSentry Contact" <${SENDER}>`,
      to: SENDER,
      replyTo: email,
      subject: `[Contact] ${name} — AgentSentry`,
      html: `
        <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;max-width:600px">
          <h2 style="color:#00ff88;margin-top:0">New contact form submission</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#888;padding:6px 0;width:80px">Name</td><td style="color:#fff">${name}</td></tr>
            <tr><td style="color:#888;padding:6px 0">Email</td><td style="color:#fff"><a href="mailto:${email}" style="color:#00ff88">${email}</a></td></tr>
          </table>
          <hr style="border-color:#222;margin:16px 0"/>
          <p style="color:#888;margin-bottom:8px">Message</p>
          <p style="color:#fff;line-height:1.6;white-space:pre-wrap">${message}</p>
        </div>
      `,
    });

    // 2. Auto-reply to the sender
    await transporter.sendMail({
      from: `"AgentSentry" <${SENDER}>`,
      to: email,
      subject: "Got your message — AgentSentry",
      html: `
        <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:32px;border-radius:8px;max-width:600px">
          <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;border:1px solid rgba(0,255,136,0.2);background:rgba(0,255,136,0.05);margin-bottom:24px">
            <span style="width:6px;height:6px;border-radius:50%;background:#00ff88;display:inline-block"></span>
            <span style="color:#00ff88;font-size:11px;letter-spacing:1px">AGENTSENTRY</span>
          </div>
          <h2 style="color:#fff;margin-top:0;font-size:20px">Hey ${name}, we got your message.</h2>
          <p style="color:#888;line-height:1.7">
            Thanks for reaching out. I read every message and typically reply within 24–48 hours.
            If it's a bug report, feel free to also open a
            <a href="https://github.com/Abhiram-ops/agent-sentry/issues/new" style="color:#00ff88">GitHub issue</a>
            for faster tracking.
          </p>
          <p style="color:#888;line-height:1.7">
            — Abhiram<br/>
            <span style="color:#555">Builder, AgentSentry</span>
          </p>
          <hr style="border-color:#1a1a1a;margin:24px 0"/>
          <p style="color:#444;font-size:12px;margin:0">
            This is an automated confirmation. Your message was received at agentsentry.tool@gmail.com.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
