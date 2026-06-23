import React from 'react';

interface GlowLineProps {
  color?: "green" | "red" | "dim";
  position?: "top" | "bottom";
  // Added "secondary" to the allowed variant strings
  variant?: "primary" | "secondary" | "danger" | "destructive" | string;
  style?: React.CSSProperties;
}

const GRADIENTS = {
  green: "linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.35) 50%, transparent 100%)",
  red:   "linear-gradient(90deg, transparent 0%, rgba(255,51,102,0.25) 50%, transparent 100%)",
  dim:   "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
};

export function GlowLine({
  color,
  position = "top",
  variant,
  style = {},
}: GlowLineProps) {
  let activeColor: "green" | "red" | "dim" = "dim";

  if (color) {
    activeColor = color;
  } else if (variant === "primary") {
    activeColor = "green";
  } else if (variant === "secondary") {
    activeColor = "dim"; // Secondary gets the dim look
  } else if (variant === "danger" || variant === "destructive") {
    activeColor = "red";
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        ...(position === "top" ? { top: 0 } : { bottom: 0 }),
        height: 1,
        background: GRADIENTS[activeColor],
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}