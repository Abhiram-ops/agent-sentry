"use client";

import { useState } from "react";
import Link from "next/link";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { CheckCircle, Copy, Check, Mail } from "lucide-react";

const STORAGE_KEY = "agentsentry_api_key";

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
      <div className="copy-field-label">{label}</div>
      <div className="copy-field-row">
        <code className="copy-field-code">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          className={`copy-field-btn ${copied ? "copied" : ""}`}
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

      localStorage.setItem(STORAGE_KEY, json.api_key);
      setResult({ api_key: json.api_key, activation_code: json.activation_code });
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error — please try again.");
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
          style={{ width: "100%", maxWidth: 520 }}
        >
          <div className="auth-header">
            <div className="auth-eyebrow">Get started</div>
            <h1>Create your free account</h1>
            <p>Get an API key and a free CLI activation code — no password, no credit card.</p>
          </div>

          {status === "success" && result ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="auth-result-card"
            >
              <div style={{ textAlign: "center" }}>
                <CheckCircle style={{ width: 40, height: 40, color: "var(--accent)", margin: "0 auto 12px" }} />
                <p>Account created!</p>
                <p>Save these now — they won&apos;t be shown again. We&apos;ve also emailed them to {email.trim().toLowerCase()}.</p>
              </div>

              <CopyField label="API key" value={result.api_key} />
              {result.activation_code && <CopyField label="CLI activation code" value={result.activation_code} />}

              <div className="next-step-box">
                <div className="copy-field-label" style={{ marginBottom: 6 }}>Next step</div>
                <code>
                  agentsentry activate {result.activation_code ?? "AS-FREE-XXXX-XXXX-XXXX-XXXX"}
                </code>
              </div>

              <Button href="/dashboard" fullWidth>Go to dashboard</Button>
            </motion.div>
          ) : status === "duplicate" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="auth-error-card"
            >
              <p>You already have an account</p>
              <p style={{ marginBottom: 20 }}>
                An account for {email.trim().toLowerCase()} already exists. Sign in with your API key instead.
              </p>
              <Button href="/login" fullWidth>Go to login</Button>
            </motion.div>
          ) : (
            <div className="auth-card">
              <div className="auth-card-top" />
              <form onSubmit={handleSubmit} className="auth-form">
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
                  {status === "submitting" ? "Creating account…" : "Create free account"}
                </button>

                <p className="auth-footnote">
                  Already have a key?{" "}
                  <Link href="/login">Sign in</Link>
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
