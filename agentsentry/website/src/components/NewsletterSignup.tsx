"use client";
import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section style={{ background: "#050505", borderTop: "1px solid #111", borderBottom: "1px solid #111", padding: "64px 24px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.15)", fontSize: 12, color: "#00ff88", marginBottom: 20, fontFamily: "monospace" }}>
          BLAST RADIUS BY AGENTSENTRY
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
          Stay ahead of machine identity threats
        </h2>
        <p style={{ color: "#666", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Weekly intel on NHI security and AI agent risks — real findings, practical commands, no fluff.
          Get it before it hits the feeds. Every Tuesday, free.
        </p>

        {status === "success" ? (
          <div style={{ padding: "16px 24px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: 12, color: "#00ff88", fontSize: 14 }}>
            You&apos;re in. Check your inbox for a welcome from Blast Radius.
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              disabled={status === "loading"}
              style={{ flex: 1, minWidth: 220, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none" }}
              onFocus={e => { e.target.style.borderColor = "rgba(0,255,136,0.4)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
            <button type="submit" disabled={status === "loading"} style={{ background: "#00ff88", border: "none", borderRadius: 10, padding: "12px 24px", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", opacity: status === "loading" ? 0.7 : 1 }}>
              {status === "loading" ? "..." : "Subscribe free"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p style={{ color: "#ff3366", fontSize: 13, marginTop: 12 }}>Something went wrong. Try again.</p>
        )}
        <p style={{ color: "#333", fontSize: 12, marginTop: 16 }}>No spam. Unsubscribe anytime. Every Tuesday.</p>
      </div>
    </section>
  );
}
