import { NextRequest, NextResponse } from "next/server";
import { sendPlainEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(ip, "/api/contact", 3, 1440);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { name, email, mobile, message } = await req.json();
  if (!name || !email || !message)
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  if (!isValidEmail(email))
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });

  const mobileInfo = mobile ? `\nMobile: ${mobile}` : "";
  try {
    await sendPlainEmail({
      from: "AgentSentry Contact <contact@agentsentry.org>",
      to: "support@agentsentry.org",
      replyTo: email,
      subject: `[Contact] ${name} — AgentSentry`,
      text: `Name: ${name}\nEmail: ${email}${mobileInfo}\n\n${message}`,
    });
    await sendPlainEmail({
      from: "AgentSentry <support@agentsentry.org>",
      to: email,
      subject: "Got your message — AgentSentry",
      text: `Hey ${name},\n\nThanks for reaching out. I reply within 24 hours.\n\n— Abhiram, AgentSentry\nsupport@agentsentry.org`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] Email error:", err);
    return NextResponse.json({ error: "Failed to send. Please try again." }, { status: 500 });
  }
}
