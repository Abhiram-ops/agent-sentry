"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Mail, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [linkError, setLinkError] = useState(false);

  // Surface ?error=invalid_link from the magic-link callback without pulling in
  // useSearchParams (which would force a Suspense boundary for static export).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "invalid_link") {
      setLinkError(true);
    }
  }, []);

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!isValidEmail(trimmed)) {
      setStatus("error");
      setErrorMsg("Enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    setLinkError(false);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.status === 429) {
        setStatus("error");
        setErrorMsg("Too many attempts. Please try again in an hour.");
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMsg(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg("Network error — please try again.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#030303", color: "#fff" }}>
      <Navbar />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: "100%", maxWidth: 480 }}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#00ff88", marginBottom: 16, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Sign in
            </div>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 16 }}>
              Welcome back
            </h1>
            <p style={{ color: "#a0a0a0", fontSize: "1rem", lineHeight: 1.75, maxWidth: 400, margin: "0 auto" }}>
              Enter your email and we&apos;ll send you a one-time sign-in link — no password needed.
            </p>
          </div>

          {status === "sent" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ borderRadius: 20, border: "1px solid rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.05)", padding: "40px", textAlign: "center" }}
            >
              <CheckCircle style={{ width: 40, height: 40, color: "#00ff88", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Check your email</p>
              <p style={{ color: "#a0a0a0", fontSize: 14, lineHeight: 1.6 }}>
                If an account exists for {email.trim().toLowerCase()}, a sign-in link is on its way. The link expires in 24 hours.
              </p>
            </motion.div>
          ) : (
            <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(160deg, #070707 0%, #050505 100%)", overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
              <div style={{ height: 2, background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent)" }} />
              <form onSubmit={handleSubmit} style={{ padding: "40px 40px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {linkError && (
                    <p style={{ fontSize: 13, color: "#ff6b6b", margin: 0 }}>
                      That sign-in link was invalid or expired. Enter your email to get a new one.
                    </p>
                  )}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", marginBottom: 8, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      <Mail style={{ width: 12, height: 12 }} /> Email
                    </label>
                    <input required type="email"
                      style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease" }}
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.4)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                  </div>

                  {status === "error" && (
                    <p style={{ fontSize: 13, color: "#ff6b6b", margin: 0 }}>{errorMsg}</p>
                  )}

                  <button type="submit" disabled={status === "submitting"}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 24px", background: status === "submitting" ? "rgba(0,255,136,0.4)" : "#00ff88", color: "#000", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", cursor: status === "submitting" ? "not-allowed" : "pointer", transition: "all 0.2s ease" }}
                    onMouseEnter={e => { if (status !== "submitting") (e.currentTarget as HTMLElement).style.background = "#1aff99"; }}
                    onMouseLeave={e => { if (status !== "submitting") (e.currentTarget as HTMLElement).style.background = "#00ff88"; }}
                  >
                    {status === "submitting" ? "Sending link…" : "Send login link"}
                  </button>

                  <p style={{ textAlign: "center", fontSize: 13, color: "#555", margin: 0 }}>
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" style={{ color: "#00ff88" }}>Create one free</Link>
                  </p>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
