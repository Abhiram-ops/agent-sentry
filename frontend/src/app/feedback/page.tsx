"use client";

import { useState } from "react";
import { NavbarWeb3 } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    problem: "",
    working: "",
    broken: "",
    wouldUse: "",
    name: "",
    email: "",
    role: "",
    other: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "8px",
    fontWeight: 700,
    fontSize: "14px",
    color: "#0f172a",
  };

  return (
    <div>
      <NavbarWeb3 />
      <main style={{ minHeight: "80vh", padding: "80px 20px 60px" }}>
        <div style={{ maxWidth: "620px", margin: "0 auto" }}>
          <div style={{ marginBottom: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#3b82f6",
                letterSpacing: "0.5px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#3b82f6",
                  display: "inline-block",
                }}
              />
              v0.2.0 · Soft Launch
            </span>
          </div>

          <h1
            style={{
              fontSize: "36px",
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 10px 0",
              lineHeight: 1.15,
            }}
          >
            Share Your Feedback
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "36px", fontSize: "16px", lineHeight: 1.6 }}>
            We shipped v0.2.0 yesterday. Before going public, we need your honest take.
            What&apos;s broken? What&apos;s missing? Takes 5 minutes.
          </p>

          <div style={{ background: "#ffffff", borderRadius: "12px", padding: "32px", border: "1px solid #e2e8f0" }}>
          {submitted ? (
            <div
              style={{
                background: "#0f1419",
                padding: "28px",
                borderRadius: "10px",
                border: "1px solid #3b82f6",
              }}
            >
              <h3 style={{ color: "#3b82f6", margin: "0 0 8px 0", fontSize: "20px" }}>
                ✓ Thank you!
              </h3>
              <p style={{ margin: 0, color: "#e2e8f0", lineHeight: 1.6 }}>
                Your feedback has been recorded. We&apos;ll follow up soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <div>
                <label style={labelStyle}>
                  What problem does AgentSentry solve for you? <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  name="problem"
                  value={formData.problem}
                  onChange={handleChange}
                  placeholder="Describe the pain point..."
                  required
                  rows={3}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>What&apos;s working well?</label>
                <textarea
                  name="working"
                  value={formData.working}
                  onChange={handleChange}
                  placeholder="What did you like?"
                  rows={3}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  What&apos;s broken or missing? <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  name="broken"
                  value={formData.broken}
                  onChange={handleChange}
                  placeholder="Be honest — what stopped you or frustrated you?"
                  required
                  rows={3}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Would you use this regularly? <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  name="wouldUse"
                  value={formData.wouldUse}
                  onChange={handleChange}
                  required
                  style={fieldStyle}
                >
                  <option value="">-- Select --</option>
                  <option value="yes">Yes</option>
                  <option value="maybe">Maybe</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>
                    Your name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Email <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={fieldStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Company / Role</label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="e.g. DevOps Engineer @ Acme"
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Anything else?</label>
                <textarea
                  name="other"
                  value={formData.other}
                  onChange={handleChange}
                  placeholder="Feature requests, random thoughts, anything..."
                  rows={3}
                  style={fieldStyle}
                />
              </div>

              {error && (
                <p style={{ color: "#ef4444", margin: 0, fontSize: "14px" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "13px 28px",
                  background: loading ? "#1e3a6e" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                  alignSelf: "flex-start",
                }}
              >
                {loading ? "Submitting..." : "Send Feedback →"}
              </button>
            </form>
          )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
