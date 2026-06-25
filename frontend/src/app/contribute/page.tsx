"use client";

import { useMemo, useState } from "react";
import { NavbarWeb3 } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { ImageRedactor } from "@/components/contribute/ImageRedactor";
import {
  findMatches,
  redactText,
  hasCriticalSecret,
  severityColor,
  type SensitiveMatch,
} from "@/lib/sensitiveData";

interface UploadedImage {
  id: string;
  file: File;
  redacted: Blob | null;
}

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB source — the redactor downscales the export.

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ContributePage() {
  const [scanText, setScanText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const matches: SensitiveMatch[] = useMemo(() => findMatches(scanText), [scanText]);
  const criticalInText = useMemo(() => hasCriticalSecret(scanText), [scanText]);

  const grouped = useMemo(() => {
    const g: Record<string, { label: string; severity: SensitiveMatch["severity"]; hint: string; count: number }> = {};
    for (const m of matches) {
      if (!g[m.id]) g[m.id] = { label: m.label, severity: m.severity, hint: m.hint, count: 0 };
      g[m.id].count += 1;
    }
    return Object.values(g);
  }, [matches]);

  const addImages = (files: FileList | null) => {
    if (!files) return;
    setError("");
    const next: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`${file.name} is over 5 MB. Please crop or compress it first.`);
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, redacted: null });
    }
    setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  };

  const setRedacted = (id: string, blob: Blob | null) =>
    setImages((prev) => prev.map((im) => (im.id === id ? { ...im, redacted: blob } : im)));

  const removeImage = (id: string) => setImages((prev) => prev.filter((im) => im.id !== id));

  const canSubmit =
    consent && !!feedback.trim() && !!name.trim() && !!email.trim() && !criticalInText && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (criticalInText) {
      setError("Your scan text still contains a live secret. Redact it before submitting.");
      return;
    }
    if (!consent) {
      setError("Please confirm consent before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const attachments = await Promise.all(
        images.map(async (im) => {
          const blob = im.redacted ?? im.file;
          return {
            filename: `redacted-${im.file.name.replace(/\.[^.]+$/, "")}.png`,
            content: await blobToBase64(blob),
          };
        }),
      );

      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          feedback,
          scanText,
          videoLink,
          attachments,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const field: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };
  const label: React.CSSProperties = {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    fontSize: 14,
    color: "#0f172a",
  };

  return (
    <div>
      <NavbarWeb3 />
      <main style={{ minHeight: "80vh", padding: "80px 20px 60px" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#3b82f6",
              letterSpacing: 0.5,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6" }} />
            Share your scan
          </span>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: "8px 0 10px", lineHeight: 1.15 }}>
            Contribute a Scan Result
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: 18, fontSize: 16, lineHeight: 1.6 }}>
            Ran a scan? Share what AgentSentry found. Real results make the tool — and our research —
            sharper. Redact anything sensitive right here before it ever leaves your device.
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 28,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>🔒</span>
            <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
              <strong style={{ color: "#e2e8f0" }}>Your privacy is the default.</strong> Image redaction
              runs entirely in your browser — originals never upload. We store nothing without your
              explicit consent below, and we never ask for live credentials.
            </p>
          </div>

          {submitted ? (
            <div style={{ background: "#fff", borderRadius: 12, padding: 32, border: "1px solid #3b82f6" }}>
              <h3 style={{ color: "#2563eb", margin: "0 0 8px", fontSize: 20 }}>✓ Thank you!</h3>
              <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                Your scan result is in. This genuinely helps us improve AgentSentry — we&apos;ll be in
                touch if we have follow-up questions.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 32, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 22 }}>
                {/* Scan text with live secret scanning */}
                <div>
                  <label style={label}>Paste your scan output (optional)</label>
                  <textarea
                    value={scanText}
                    onChange={(e) => setScanText(e.target.value)}
                    placeholder="Paste the terminal output or JSON from `agentsentry scan`…"
                    rows={6}
                    style={{ ...field, fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                  />

                  {grouped.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                          {criticalInText ? "⚠ Sensitive data detected" : "Possible sensitive data"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setScanText((t) => redactText(t))}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "5px 12px",
                            borderRadius: 6,
                            border: "1px solid #3b82f6",
                            background: "#3b82f6",
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          Auto-redact all
                        </button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {grouped.map((g) => {
                          const c = severityColor(g.severity);
                          return (
                            <span
                              key={g.label}
                              title={g.hint}
                              style={{
                                fontSize: 11,
                                padding: "3px 8px",
                                borderRadius: 20,
                                background: c.bg,
                                border: `1px solid ${c.border}`,
                                color: c.text,
                                fontWeight: 600,
                              }}
                            >
                              {g.label} ×{g.count}
                            </span>
                          );
                        })}
                      </div>
                      {criticalInText && (
                        <p style={{ fontSize: 12, color: "#dc2626", margin: "8px 0 0" }}>
                          A live secret is still present. Use “Auto-redact all” (or edit it out) before submitting.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Screenshots */}
                <div>
                  <label style={label}>Screenshots (optional)</label>
                  <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px" }}>
                    Up to {MAX_IMAGES} images. After uploading, drag over anything sensitive to pixelate it.
                  </p>
                  {images.length < MAX_IMAGES && (
                    <label
                      style={{
                        display: "inline-block",
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "8px 16px",
                        borderRadius: 6,
                        border: "1px dashed #94a3b8",
                        background: "#f8fafc",
                        color: "#334155",
                        cursor: "pointer",
                      }}
                    >
                      + Add screenshot
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => addImages(e.target.files)}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: images.length ? 12 : 0 }}>
                    {images.map((im) => (
                      <ImageRedactor
                        key={im.id}
                        file={im.file}
                        onRedacted={(blob) => setRedacted(im.id, blob)}
                        onRemove={() => removeImage(im.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Video link (not a file upload — see note) */}
                <div>
                  <label style={label}>Video walkthrough link (optional)</label>
                  <input
                    type="url"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    placeholder="Loom, Google Drive, or an unlisted YouTube link"
                    style={field}
                  />
                  <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>
                    We take a link rather than the file so you keep control of access and can revoke it anytime.
                  </p>
                </div>

                {/* Feedback */}
                <div>
                  <label style={label}>
                    What did you find? <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What surprised you? What was useful? What broke?"
                    required
                    rows={4}
                    style={field}
                  />
                </div>

                {/* Identity */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={label}>
                      Your name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={field} />
                  </div>
                  <div>
                    <label style={label}>
                      Email <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={field} />
                  </div>
                </div>
                <div>
                  <label style={label}>Company / Role (optional)</label>
                  <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. DevOps Engineer @ Acme" style={field} />
                </div>

                {/* Consent gate */}
                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "12px 14px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                    I confirm I&apos;ve redacted anything sensitive, and I consent to AgentSentry storing
                    and reviewing what I submit here to improve the product and its research.
                    <span style={{ color: "#ef4444" }}> *</span>
                  </span>
                </label>

                {error && <p style={{ color: "#dc2626", margin: 0, fontSize: 14 }}>{error}</p>}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    padding: "13px 28px",
                    background: canSubmit ? "#3b82f6" : "#1e3a6e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    alignSelf: "flex-start",
                    opacity: canSubmit ? 1 : 0.6,
                  }}
                >
                  {submitting ? "Submitting…" : "Submit scan result →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
