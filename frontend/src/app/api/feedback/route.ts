import { NextRequest, NextResponse } from "next/server";
import { sendPlainEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { problem, working, broken, wouldUse, name, email, role, other } = body;

    if (!problem || !broken || !wouldUse || !name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await sendPlainEmail({
      from: "AgentSentry Feedback <contact@agentsentry.org>",
      to: "srikar@agentsentry.org",
      replyTo: email,
      subject: `[Feedback] ${name} — Would use: ${wouldUse}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Role: ${role || "—"}`,
        `Would use regularly: ${wouldUse}`,
        ``,
        `--- What problem does AgentSentry solve? ---`,
        problem,
        ``,
        `--- What's working well? ---`,
        working || "—",
        ``,
        `--- What's broken or missing? ---`,
        broken,
        ``,
        `--- Anything else? ---`,
        other || "—",
        ``,
        `Submitted: ${new Date().toISOString()}`,
      ].join("\n"),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Feedback] error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
