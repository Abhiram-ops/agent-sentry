"use client";

import { useState } from "react";
import Link from "next/link";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { CheckCircle, Copy, Check, Mail } from "lucide-react";

interface SignupResult {
  api_key: string;
  activation_code: string | null;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#888", marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <code style={{ flex: 1, display: "block", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.04)", color: "#00ff88", fontSize: 13, wordBreak: "break-all" }}>
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: copied ? "#00ff88" : "#a0a0a0", cursor: "pointer" }}
        >
          {copied ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
        </button>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "duplicate" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<SignupResult | null>(null);

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

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();

      if (res.status === 409) {
        setStatus("duplicate");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult({ api_key: json.api_key, activation_code: json.activation_code });
      setStatus("success");
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
          style={{ width: "100%", maxWidth: 520 }}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#00ff88", marginBottom: 16, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Get started
            </div>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 16 }}>
              Create your free account
            </h1>
            <p style={{ color: "#a0a0a0", fontSize: "1rem", lineHeight: 1.75, maxWidth: 400, margin: "0 auto" }}>
              Get an API key and a free CLI activation code — no password, no credit card.
            </p>
          </div>

          {status === "success" && result ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ borderRadius: 20, border: "1px solid rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.05)", padding: "40px", display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div style={{ textAlign: "center" }}>
                <CheckCircle style={{ width: 40, height: 40, color: "#00ff88", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Account created!</p>
                <p style={{ color: "#a0a0a0", fontSize: 14 }}>We&apos;ve also emailed these to {email.trim().toLowerCase()}.</p>
              </div>

              <CopyField label="API key" value={result.api_key} />
              {result.activation_code && <CopyField label="CLI activation code" value={result.activation_code} />}

              <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: "#888", marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Next step
                </div>
                <code style={{ display: "block", fontFamily: "monospace", fontSize: 13, color: "#00ff88" }}>
                  agentsentry activate {result.activation_code ?? "AS-FREE-XXXX-XXXX-XXXX-XXXX"}
                </code>
              </div>

              <Button href="/dashboard" fullWidth>Go to dashboard</Button>
            </motion.div>
          ) : status === "duplicate" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ borderRadius: 20, border: "1px solid rgba(255,51,102,0.2)", background: "rgba(255,51,102,0.05)", padding: "40px", textAlign: "center" }}
            >
              <p style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 8 }}>You already have an account</p>
              <p style={{ color: "#a0a0a0", marginBottom: 20 }}>
                An account for {email.trim().toLowerCase()} already exists. Sign in with your API key instead.
              </p>
              <Button href="/login" fullWidth>Go to login</Button>
            </motion.div>
          ) : (
            <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(160deg, #070707 0%, #050505 100%)", overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
              <div style={{ height: 2, background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent)" }} />
              <form onSubmit={handleSubmit} style={{ padding: "40px 40px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                    {status === "submitting" ? "Creating account…" : "Create free account"}
                  </button>

                  <p style={{ textAlign: "center", fontSize: 13, color: "#555", margin: 0 }}>
                    Already have a key?{" "}
                    <Link href="/login" style={{ color: "#00ff88" }}>Sign in</Link>
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
