"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";

const STORAGE_KEY = "agentsentry_api_key";

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const key = apiKey.trim();

    if (!key) {
      setStatus("error");
      setErrorMsg("Enter your API key.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/user/credits", {
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Invalid API key — check your signup email or create an account.");
        return;
      }

      localStorage.setItem(STORAGE_KEY, key);
      router.push("/dashboard");
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
              Paste the API key from your signup email to view your dashboard.
            </p>
          </div>

          <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(160deg, #070707 0%, #050505 100%)", overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
            <div style={{ height: 2, background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent)" }} />
            <form onSubmit={handleSubmit} style={{ padding: "40px 40px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", marginBottom: 8, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    <KeyRound style={{ width: 12, height: 12 }} /> API key
                  </label>
                  <input required type="text"
                    style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "monospace", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease" }}
                    placeholder="Paste your 64-character API key"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
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
                  {status === "submitting" ? "Checking…" : "View dashboard"}
                </button>

                <p style={{ textAlign: "center", fontSize: 13, color: "#555", margin: 0 }}>
                  Don&apos;t have a key?{" "}
                  <Link href="/signup" style={{ color: "#00ff88" }}>Create an account</Link>
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
