import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "stretch",
          background: "linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0f1724 100%)",
          fontFamily: '"Playfair Display", serif',
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            opacity: 0.3,
          }}
        />

        {/* Accent glow (top right) */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "80px",
            paddingRight: "100px",
            flex: 1,
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Top badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "32px",
              fontSize: "16px",
              color: "#3b82f6",
              fontWeight: "600",
              fontFamily: '"DM Sans", sans-serif',
              letterSpacing: "0.5px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#3b82f6",
              }}
            />
            Open Source · v0.2.0
          </div>

          {/* Main heading */}
          <h1
            style={{
              fontSize: "64px",
              fontWeight: "800",
              color: "#ffffff",
              margin: "0 0 20px 0",
              lineHeight: "1.1",
              maxWidth: "900px",
              letterSpacing: "-1px",
            }}
          >
            Find Every Machine Identity Before They Do
          </h1>

          {/* Subheading */}
          <p
            style={{
              fontSize: "20px",
              color: "#cbd5e1",
              margin: "0 0 32px 0",
              maxWidth: "700px",
              lineHeight: "1.6",
              fontFamily: '"DM Sans", sans-serif',
              fontWeight: "400",
            }}
          >
            Discover ungoverned AI agents and service accounts. Score blast radius. Fix before attackers do.
          </p>

          {/* Feature list */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px 40px",
              marginTop: "20px",
            }}
          >
            {[
              "Multi-cloud NHI discovery",
              "P×R×E×A blast scoring",
              "Least-privilege analysis",
              "Attack graph visualization",
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px",
                  color: "#e2e8f0",
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                <span style={{ color: "#3b82f6", fontSize: "18px", fontWeight: "bold" }}>✓</span>
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Right side accent panel */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "320px",
            background: "linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)",
            borderLeft: "1px solid rgba(59, 130, 246, 0.2)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-end",
            padding: "60px 40px",
            zIndex: 1,
          }}
        >
          {/* Bottom right logo/branding */}
          <div
            style={{
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                fontWeight: "800",
                color: "#ffffff",
                marginBottom: "8px",
              }}
            >
              Agent<span style={{ color: "#3b82f6" }}>Sentry</span>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              NHI Risk Auditor
            </div>
          </div>
        </div>

        {/* Bottom left URL */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "80px",
            fontSize: "14px",
            color: "#64748b",
            zIndex: 2,
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          agentsentry.org
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
