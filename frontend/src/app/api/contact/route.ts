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
    });
    await transporter.sendMail({
      from: `"AgentSentry" <${gmailUser}>`,
      to: email,
      subject: "Got your message — AgentSentry",
      text: `Hey ${name},\n\nThanks for reaching out. I reply within 24-48 hours.\n\n— Abhiram, AgentSentry`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] Email error:", err);
    return NextResponse.json({ error: "Failed to send. Please try again." }, { status: 500 });
  }
        }
