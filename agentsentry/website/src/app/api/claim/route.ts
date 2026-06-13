import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";

function generateKey(): string {
  const hex = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `AS-FREE-${hex()}-${hex()}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = body as { email?: string };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const key = generateKey();

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    console.error("[claim] Gmail env vars missing");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"AgentSentry" <${gmailUser}>`,
      to: email,
      subject: "Your AgentSentry free access — key + installer",
      text: [
        "Hi,",
        "",
        "Here's your AgentSentry free activation key:",
        "",
        `  ${key}`,
        "",
        "Install and activate:",
        "  pip install agentsentry",
        `  agentsentry activate ${key}`,
        "",
        "Then run your first scan:",
        "  agentsentry scan local",
        "  agentsentry scan aws",
        "",
        "Reply to this email if anything doesn't work — I read every one.",
        "",
        "— Abhiram",
        "  AgentSentry · https://agentsentry.tool",
      ].join("\n"),
      html: `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;
     padding:36px 32px;background:#fff;color:#333;border-radius:8px">

  <p style="font-size:18px;font-weight:700;margin:0 0 2px;color:#111">AgentSentry</p>
  <p style="font-size:12px;color:#aaa;margin:0 0 32px;font-family:monospace">
    NHI &amp; AI Agent Security Scanner</p>

  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;color:#111">
    Your free access is ready.</h2>
  <p style="font-size:15px;line-height:1.7;color:#555;margin:0 0 24px">
    Below is your activation key and everything you need to run your first scan.</p>

  <div style="background:#f5f5f5;border-radius:8px;padding:20px 24px;margin:0 0 28px">
    <p style="margin:0 0 6px;font-size:11px;color:#999;font-family:monospace;
       text-transform:uppercase;letter-spacing:0.12em">Activation key</p>
    <p style="margin:0;font-size:22px;font-weight:700;color:#16a34a;
       font-family:monospace;letter-spacing:0.06em">${key}</p>
  </div>

  <p style="font-size:14px;font-weight:600;color:#111;margin:0 0 10px">
    Install &amp; activate:</p>
  <div style="background:#0a0a0a;border-radius:8px;padding:18px 20px;
       font-family:monospace;font-size:13px;color:#00ff88;margin:0 0 28px;line-height:1.8">
    <span style="color:#555"># install from PyPI</span><br/>
    pip install agentsentry<br/><br/>
    <span style="color:#555"># activate your key</span><br/>
    agentsentry activate ${key}<br/><br/>
    <span style="color:#555"># run your first scan</span><br/>
    agentsentry scan local
  </div>

  <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 28px">
    Reply to this email if anything doesn't work — I read and respond to every one.</p>

  <p style="font-size:12px;color:#bbb;border-top:1px solid #eee;padding-top:16px;margin:0">
    — Abhiram Lanka &nbsp;·&nbsp;
    <a href="https://agentsentry.tool" style="color:#16a34a;text-decoration:none">
      agentsentry.tool</a>
  </p>
</div>`,
    });
  } catch (err) {
    console.error("[claim] Send error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not send email. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
