"use client";

import { useState } from "react";
import Link from "next/link";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { CheckCircle, Copy, Check, Mail } from "lucide-react";

interface SignupResult {
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
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "duplicate" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<SignupResult | null>(null);

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // Step 1 — submitting the email opens the consent dialog. No account is
  // created until the user explicitly grants consent in the dialog.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!isValidEmail(trimmed)) {
      setStatus("error");
      setErrorMsg("Enter a valid email address.");
      return;
    }

    setErrorMsg("");
    setConsentChecked(false);
    setShowConsent(true);
  }

  // Step 2 — runs only after the user grants consent in the dialog.
  async function doSignup() {
    const trimmed = email.trim().toLowerCase();
    setShowConsent(false);
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, accepted_terms: true }),
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

      setResult({ activation_code: json.activation_code });
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
            <p>Get a free CLI activation code — no password, no credit card.</p>
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
                <p>Save this now — it won&apos;t be shown again. We&apos;ve also emailed it to {email.trim().toLowerCase()}.</p>
              </div>

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
                An account for {email.trim().toLowerCase()} already exists. Sign in with your email instead.
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
                  style={{ width: "100%", justifyContent: "center", opacity: status === "submitting" ? 0.55 : 1, cursor: status === "submitting" ? "not-allowed" : "pointer" }}
                >
                  {status === "submitting" ? "Creating account…" : "Create free account"}
                </button>

                <p className="auth-footnote" style={{ marginTop: -4 }}>
                  By continuing you&apos;ll be asked to accept our{" "}
                  <Link href="/terms" target="_blank">Terms</Link> and{" "}
                  <Link href="/privacy" target="_blank">Privacy Policy</Link>.
                </p>

                <p className="auth-footnote">
                  Already have an account?{" "}
                  <Link href="/login">Sign in</Link>
                </p>
              </form>
            </div>
          )}
        </motion.div>
      </main>

      {showConsent && (
        <div
          className="consent-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
          onClick={() => setShowConsent(false)}
        >
          <motion.div
            className="consent-modal"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 id="consent-title" className="consent-modal-title">
              Before you create your account
            </h2>
            <p className="consent-modal-lead">
              AgentSentry is a security tool. To create an account you need to agree to how it may be
              used and how we handle your data.
            </p>

            <div className="consent-modal-body">
              <p>
                <strong>Authorized use only.</strong> You&apos;ll scan only systems you own or are
                explicitly authorized to audit.
              </p>
              <p>
                <strong>Your credentials stay with you.</strong> The CLI runs on your machine; your cloud
                credentials and scan results never reach our servers.
              </p>
              <p>
                <strong>Data we store.</strong> Only your email, account/license status, and a record of
                this consent (version, time, IP). Nothing else — no scan contents, no extra profile data.
              </p>
            </div>

            <label className="consent-row consent-modal-check">
              <input
                type="checkbox"
                className="consent-checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
              />
              <span className="consent-text">
                I have read and agree to the{" "}
                <Link href="/terms" target="_blank">Terms of Service</Link> and{" "}
                <Link href="/privacy" target="_blank">Privacy Policy</Link>.
              </span>
            </label>

            <div className="consent-modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowConsent(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!consentChecked}
                style={{ opacity: consentChecked ? 1 : 0.55, cursor: consentChecked ? "pointer" : "not-allowed" }}
                onClick={doSignup}
              >
                Agree &amp; create account
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  );
}
