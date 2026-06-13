import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

  if (!name || !email || !message)
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  if (!email.includes("@"))
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass)
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });

  const transporter = nodemailer.createTransport({
    service: "gmail", auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    await transporter.sendMail({
      from: `"AgentSentry Contact" <${gmailUser}>`,
      to: gmailUser, replyTo: email,
      subject: `[Contact] ${name} — AgentSentry`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;background:#fff;color:#333">
<h2 style="color:#111;margin-top:0">New contact from ${name}</h2>
<p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
<hr style="border-color:#eee"/>
<p style="white-space:pre-wrap;line-height:1.6">${message}</p>
</div>`,
    });

    await transporter.sendMail({
      from: `"AgentSentry" <${gmailUser}>`,
      to: email,
      subject: "Got your message — AgentSentry",
      text: `Hey ${name},\n\nThanks for reaching out. I read every message and typically reply within 24–48 hours.\n\nFor bugs, open a GitHub issue: https://github.com/Abhiram-ops/agent-sentry/issues/new\n\n— Abhiram, AgentSentry`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;padding:32px;background:#fff;color:#333">
<h2 style="color:#111;margin-top:0">Hey ${name}, got your message.</h2>
<p style="color:#555;line-height:1.7">Thanks for reaching out. I read every message and typically reply within 24–48 hours. For bugs, feel free to also open a <a href="https://github.com/Abhiram-ops/agent-sentry/issues/new" style="color:#16a34a">GitHub issue</a>.</p>
<p style="color:#555">— Abhiram<br/><span style="color:#999">Builder, AgentSentry</span></p>
<p style="font-size:12px;color:#aaa;border-top:1px solid #eee;padding-top:16px;margin-top:24px">This is an automated confirmation. Your message was received at agentsentry.tool@gmail.com.</p>
</div>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] Email error:", err);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
