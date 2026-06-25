import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rateLimit";
import { hasCriticalSecret, redactText } from "@/lib/sensitiveData";

interface Attachment {
  filename: string;
  content: string; // base64
}

// Vercel serverless request bodies are capped at ~4.5 MB. We budget below that
// for base64-encoded attachments and reject anything larger with a clear error.
const MAX_TOTAL_ATTACHMENT_B64 = 4_000_000;
const MAX_ATTACHMENTS = 3;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(ip, "/api/contribute", 5, 1440);
  if (!allowed) {
    return NextResponse.json({ error: "Too many submissions today. Try again tomorrow." }, { status: 429 });
  }

  let body: {
    name?: string;
    email?: string;
    role?: string;
    feedback?: string;
    scanText?: string;
    videoLink?: string;
    attachments?: Attachment[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, email, role, feedback, scanText = "", videoLink = "", attachments = [] } = body;

  if (!name || !email || !feedback) {
    return NextResponse.json({ error: "Name, email, and feedback are required." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  // Safety net: never accept text that still carries a live secret, even if the
  // client checks were bypassed. We hard-redact server-side before it's stored
  // anywhere, so a leaked key can't land in an inbox.
  let safeScanText = scanText;
  if (scanText && hasCriticalSecret(scanText)) {
    safeScanText = redactText(scanText);
  }

  // Enforce attachment limits server-side.
  if (attachments.length > MAX_ATTACHMENTS) {
    return NextResponse.json({ error: `At most ${MAX_ATTACHMENTS} images allowed.` }, { status: 400 });
  }
  const totalB64 = attachments.reduce((sum, a) => sum + (a.content?.length ?? 0), 0);
  if (totalB64 > MAX_TOTAL_ATTACHMENT_B64) {
    return NextResponse.json(
      { error: "Images are too large. Please crop or compress them and try again." },
      { status: 413 },
    );
  }

  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Role: ${role || "—"}`,
    ``,
    `--- What did you find? ---`,
    feedback,
    ``,
    `--- Scan output (server-side secret-scrubbed) ---`,
    safeScanText || "—",
    ``,
    `--- Video link ---`,
    videoLink || "—",
    ``,
    `Screenshots attached: ${attachments.length}`,
    `Submitted: ${new Date().toISOString()}`,
  ];

  if (!process.env.RESEND_API_KEY) {
    console.warn("[contribute] RESEND_API_KEY not set — logging instead of emailing");
    console.log("[contribute]", lines.join("\n"));
    return NextResponse.json({ success: true });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "AgentSentry Contribute <contact@agentsentry.org>",
      to: "srikar@agentsentry.org",
      replyTo: email,
      subject: `[Scan Result] ${name}${role ? ` — ${role}` : ""}`,
      text: lines.join("\n"),
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contribute] email error:", err);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }
}
