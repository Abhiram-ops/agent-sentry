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
    <section className="section section-dark">
      <div className="container newsletter-inner">
        <span className="newsletter-eyebrow">Blast Radius by AgentSentry</span>
        <h2>Stay ahead of machine identity threats</h2>
        <p>
          Weekly intel on NHI security and AI agent risks — real findings, practical commands, no fluff.
          Join security engineers and DevOps teams already subscribed.
        </p>

        {status === "success" ? (
          <div style={{ padding: "16px 24px", background: "rgba(29,78,216,0.1)", border: "1px solid rgba(29,78,216,0.25)", borderRadius: "var(--radius)", color: "#93c5fd", fontSize: 14 }}>
            You&apos;re in. Check your inbox for a welcome from Blast Radius.
          </div>
        ) : (
          <form onSubmit={submit} className="newsletter-form">
            <input
              type="email"
              className="newsletter-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              disabled={status === "loading"}
            />
            <button type="submit" disabled={status === "loading"} className="btn btn-primary">
              {status === "loading" ? "..." : "Subscribe free"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="newsletter-status" style={{ color: "var(--critical)" }}>Something went wrong. Try again.</p>
        )}
        <p className="newsletter-note">No spam. Unsubscribe anytime. Every Tuesday.</p>
      </div>
    </section>
  );
}
