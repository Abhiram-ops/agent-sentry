import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          padding: "60px 80px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Glow blobs */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(0,255,136,0.08)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(0,255,136,0.06)", display: "flex" }} />

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(0,255,136,0.1)", border: "1.5px solid rgba(0,255,136,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
            Agent<span style={{ color: "#00ff88" }}>Sentry</span>
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 64, fontWeight: 800, color: "#ffffff", marginBottom: 18, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          Find every Machine<br />Identity before they do.
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 26, color: "#00ff88", fontWeight: 600, marginBottom: 40 }}>
          NHI &amp; AI Agent Risk Auditor — Free &amp; Open Source
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {["Multi-cloud NHI discovery", "P×R×E×A blast scoring", "Least-privilege analysis", "Attack graph"].map(f => (
            <div key={f} style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 999, padding: "8px 20px", fontSize: 18, color: "#e0e6ed", display: "flex" }}>
              {f}
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ position: "absolute", bottom: 44, left: 80, right: 80, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 20, color: "#7a8a9a" }}>agentsentry.org</span>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#00ff88", border: "1.5px solid rgba(0,255,136,0.4)", padding: "8px 22px", borderRadius: 8, display: "flex" }}>
            v0.2.0
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
