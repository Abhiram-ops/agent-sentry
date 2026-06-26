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
      setErrorMsg("Network error, please try again.");
    }
  }

  return (
    <div className="auth-shell">
      <Navbar />
      <main className="auth-main">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: "100%", maxWidth: 480 }}
        >
          <div className="auth-header">
            <div className="auth-eyebrow">Sign in</div>
            <h1>Welcome back</h1>
            <p>Enter your email and we&apos;ll send you a one-time sign-in link, no password needed.</p>
          </div>

          {status === "sent" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="auth-result-card centered"
            >
              <CheckCircle style={{ width: 40, height: 40, color: "var(--accent)", margin: "0 auto 12px" }} />
              <p>Check your email</p>
              <p>
                If an account exists for {email.trim().toLowerCase()}, a sign-in link is on its way. The link expires in 24 hours.
              </p>
            </motion.div>
          ) : (
            <div className="auth-card">
              <div className="auth-card-top" />
              <form onSubmit={handleSubmit} className="auth-form">
                {linkError && (
                  <p className="auth-error-text">
                    That sign-in link was invalid or expired. Enter your email to get a new one.
                  </p>
                )}
                <div>
                  <label className="auth-label">
                    <Mail style={{ width: 12, height: 12 }} /> Email
                  </label>
                  <input required type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {status === "error" && (
                  <p className="auth-error-text">{errorMsg}</p>
                )}

                <button type="submit" disabled={status === "submitting"}
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%", justifyContent: "center", opacity: status === "submitting" ? 0.7 : 1, cursor: status === "submitting" ? "not-allowed" : "pointer" }}
                >
                  {status === "submitting" ? "Sending link…" : "Send login link"}
                </button>

                <p className="auth-footnote">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup">Create one free</Link>
                </p>
              </form>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
