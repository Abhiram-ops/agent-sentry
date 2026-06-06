"use client";

import { useState } from "react";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Send, CheckCircle, Mail, Phone, User, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", mobile: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
      setForm({ name: "", email: "", mobile: "", message: "" });
    } catch {
      setStatus("error");
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
              Contact
            </div>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 16 }}>
              Get in touch
            </h1>
            <p style={{ color: "#a0a0a0", fontSize: "1rem", lineHeight: 1.75, maxWidth: 400, margin: "0 auto" }}>
              Questions, partnerships, enterprise inquiries — I reply within 24 hours.
            </p>
          </div>

          {status === "sent" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ borderRadius: 20, border: "1px solid rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.05)", padding: "48px 40px", textAlign: "center" }}
            >
              <CheckCircle style={{ width: 48, height: 48, color: "#00ff88", margin: "0 auto 20px" }} />
              <p style={{ fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Message sent!</p>
              <p style={{ color: "#a0a0a0" }}>Check your inbox — a confirmation is on its way.</p>
            </motion.div>
          ) : (
            <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(160deg, #070707 0%, #050505 100%)", overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
              <div style={{ height: 2, background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent)" }} />
              <form onSubmit={handleSubmit} style={{ padding: "40px 40px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", marginBottom: 8, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      <User style={{ width: 12, height: 12 }} /> Name
                    </label>
                    <input required
                      style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease" }}
                      placeholder="Your full name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.4)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                  </div>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", marginBottom: 8, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      <Mail style={{ width: 12, height: 12 }} /> Email
                    </label>
                    <input required type="email"
                      style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease" }}
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.4)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                  </div>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", marginBottom: 8, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      <Phone style={{ width: 12, height: 12 }} /> Mobile <span style={{ color: "#555", fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input type="tel"
                      style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease" }}
                      placeholder="+1 234 567 8900"
                      value={form.mobile}
                      onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.4)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                  </div>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", marginBottom: 8, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      <MessageSquare style={{ width: 12, height: 12 }} /> Message
                    </label>
                    <textarea required rows={5}
                      style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "none", transition: "border-color 0.2s ease", fontFamily: "inherit" }}
                      placeholder="What's on your mind?"
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.4)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                  </div>
                  {status === "error" && (
                    <p style={{ fontSize: 13, color: "#ff6b6b", margin: 0 }}>Something went wrong. Please try again.</p>
                  )}
                  <button type="submit" disabled={status === "sending"}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 24px", background: status === "sending" ? "rgba(0,255,136,0.4)" : "#00ff88", color: "#000", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", cursor: status === "sending" ? "not-allowed" : "pointer", transition: "all 0.2s ease" }}
                    onMouseEnter={e => { if (status !== "sending") (e.currentTarget as HTMLElement).style.background = "#1aff99"; }}
                    onMouseLeave={e => { if (status !== "sending") (e.currentTarget as HTMLElement).style.background = "#00ff88"; }}
                  >
                    <Send style={{ width: 15, height: 15 }} />
                    {status === "sending" ? "Sending…" : "Send Message"}
                  </button>
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
