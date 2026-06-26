"use client";

import { useState } from "react";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Send, CheckCircle, Mail, Phone, User, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", mobile: "", message: "", website: "" });
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
      setForm({ name: "", email: "", mobile: "", message: "", website: "" });
    } catch {
      setStatus("error");
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
            <div className="auth-eyebrow">Contact</div>
            <h1>Get in touch</h1>
            <p>Questions, partnerships, enterprise inquiries, I reply within 24 hours.</p>
          </div>

          {status === "sent" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="auth-result-card centered"
            >
              <CheckCircle style={{ width: 48, height: 48, color: "var(--accent)", margin: "0 auto 20px" }} />
              <p>Message sent!</p>
              <p>Check your inbox, a confirmation is on its way.</p>
            </motion.div>
          ) : (
            <div className="auth-card">
              <div className="auth-card-top" />
              <form onSubmit={handleSubmit} className="auth-form">
                {/* Honeypot field, hidden from real users, bots tend to fill every input */}
                <input type="text"
                  name="website"
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                  style={{ position: "absolute", width: 1, height: 1, padding: 0, border: 0, opacity: 0, pointerEvents: "none" }}
                />
                <div>
                  <label className="auth-label">
                    <User style={{ width: 12, height: 12 }} /> Name
                  </label>
                  <input required
                    className="auth-input"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="auth-label">
                    <Mail style={{ width: 12, height: 12 }} /> Email
                  </label>
                  <input required type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="auth-label">
                    <Phone style={{ width: 12, height: 12 }} /> Mobile <span style={{ color: "var(--text-faint)", fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>(optional)</span>
                  </label>
                  <input type="tel"
                    className="auth-input"
                    placeholder="+1 234 567 8900"
                    value={form.mobile}
                    onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="auth-label">
                    <MessageSquare style={{ width: 12, height: 12 }} /> Message
                  </label>
                  <textarea required rows={5}
                    className="auth-input"
                    style={{ resize: "none", fontFamily: "inherit" }}
                    placeholder="What's on your mind?"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  />
                </div>
                {status === "error" && (
                  <p className="auth-error-text">Something went wrong. Please try again.</p>
                )}
                <button type="submit" disabled={status === "sending"}
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%", justifyContent: "center", opacity: status === "sending" ? 0.7 : 1, cursor: status === "sending" ? "not-allowed" : "pointer" }}
                >
                  <Send style={{ width: 15, height: 15 }} />
                  {status === "sending" ? "Sending…" : "Send Message"}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
