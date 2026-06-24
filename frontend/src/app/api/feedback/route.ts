import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { problem, working, broken, wouldUse, name, email, role, other } = body;

    if (!problem || !broken || !wouldUse || !name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("[Feedback]", {
      name,
      email,
      role,
      wouldUse,
      problem,
      working,
      broken,
      other,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Feedback] error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
