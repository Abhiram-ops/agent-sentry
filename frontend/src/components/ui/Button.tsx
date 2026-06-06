import React from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

const BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontWeight: 600,
  borderRadius: 10,
  cursor: "pointer",
  textDecoration: "none",
  border: "none",
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
  fontFamily: "inherit",
};

const SIZE: Record<string, React.CSSProperties> = {
  sm: { fontSize: 13, padding: "8px 16px" },
  md: { fontSize: 14, padding: "11px 22px" },
  lg: { fontSize: 15, padding: "14px 28px" },
};

const VARIANT: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--green)",
    color: "#000",
    boxShadow: "0 0 20px rgba(0,255,136,0.15)",
  },
  secondary: {
    background: "transparent",
    color: "var(--text-1)",
    border: "1px solid var(--border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-2)",
    border: "none",
  },
};

export function Button({
  children,
  variant = "primary",
  href,
  external = false,
  onClick,
  disabled = false,
  fullWidth = false,
  size = "md",
  style: styleProp,
}: ButtonProps) {
  const style: React.CSSProperties = {
    ...BASE,
    ...SIZE[size],
    ...VARIANT[variant],
    ...(fullWidth ? { width: "100%" } : {}),
    ...(disabled ? { opacity: 0.4, cursor: "not-allowed" } : {}),
    ...styleProp,
  };

  if (href) {
    return (
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        style={style}
      >
        {children}
      </Link>
    );
  }

  return (
    <button style={style} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
