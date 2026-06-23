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
        {/* Shield Icon */}
        <div style={{ marginBottom: 40 }}>
          <svg width="80" height="80" viewBox="0 0 100 100">
            <rect
              x="30"
              y="20"
              width="40"
              height="60"
              rx="4"
              stroke="#00ff88"
              strokeWidth="2.5"
              fill="none"
            />
            <line
              x1="50"
              y1="40"
              x2="50"
              y2="70"
              stroke="#00ff88"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="40"
              y1="55"
              x2="60"
              y2="55"
              stroke="#00ff88"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color: "#ffffff",
            marginBottom: 20,
            letterSpacing: "-1px",
          }}
        >
          AgentSentry
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: "#00ff88",
            fontWeight: 600,
            marginBottom: 40,
          }}
        >
          NHI &amp; AI Agent Risk Auditor
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 24,
            color: "#b0bcc9",
            lineHeight: 1.5,
            marginBottom: 60,
            maxWidth: 800,
          }}
        >
          Discover every machine identity. Score blast radius.
          <br />
          Fix what matters. Free &amp; open source.
        </div>

        {/* Features grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: 18, color: "#e0e6ed" }}>
            ✓ Multi-cloud NHI discovery
          </div>
          <div style={{ fontSize: 18, color: "#e0e6ed" }}>
            ✓ P×R×E×A blast scoring
          </div>
          <div style={{ fontSize: 18, color: "#e0e6ed" }}>
            ✓ Data-driven least-privilege
          </div>
          <div style={{ fontSize: 18, color: "#e0e6ed" }}>
            ✓ Interactive attack graph
          </div>
        </div>

        {/* Bottom info */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 80,
            fontSize: 18,
            color: "#7a8a9a",
          }}
        >
          agentsentry.org
        </div>

        {/* Version badge */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 80,
            fontSize: 28,
            fontWeight: "bold",
            color: "#00ff88",
            border: "2px solid #00ff88",
            padding: "10px 20px",
            borderRadius: 8,
            opacity: 0.8,
          }}
        >
          v0.2.0
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
