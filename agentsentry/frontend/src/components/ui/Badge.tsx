import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "red" | "yellow" | "neutral";
  dot?: boolean;
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  green: {
    color: "var(--green)",
    background: "rgba(0, 255, 136, 0.06)",
    border: "1px solid rgba(0, 255, 136, 0.15)",
  },
  red: {
    color: "var(--red)",
    background: "rgba(255, 51, 102, 0.06)",
    border: "1px solid rgba(255, 51, 102, 0.15)",
  },
  yellow: {
    color: "var(--yellow)",
    background: "rgba(255, 204, 0, 0.06)",
    border: "1px solid rgba(255, 204, 0, 0.15)",
  },
  neutral: {
    color: "var(--text-2)",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid var(--border)",
  },
};

export function Badge({
  children,
  variant = "green",
  dot = false,
}: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontFamily: "var(--font-geist-mono), monospace",
        fontWeight: 500,
        letterSpacing: "0.01em",
        ...VARIANT_STYLES[variant],
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            flexShrink: 0,
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      )}
      {children}
    </span>
  );
}
