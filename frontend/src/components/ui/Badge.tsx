import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "red" | "yellow" | "neutral";
  dot?: boolean;
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  green: {
    color: "var(--accent)",
    background: "var(--accent-subtle)",
    border: "1px solid var(--accent-muted)",
  },
  red: {
    color: "#dc2626",
    background: "#fef2f2",
    border: "1px solid #fecaca",
  },
  yellow: {
    color: "#b45309",
    background: "#fffbeb",
    border: "1px solid #fde68a",
  },
  neutral: {
    color: "var(--text-muted)",
    background: "var(--bg-subtle)",
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
