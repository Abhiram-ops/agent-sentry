import React from "react";

// ── Shared visual props (never bleed through to DOM) ──────────────────────────
interface SharedVisualProps {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

// ── Discriminated union on href ───────────────────────────────────────────────
type AnchorProps = SharedVisualProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof SharedVisualProps> & {
    href: string;
  };

type ButtonProps = SharedVisualProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof SharedVisualProps> & {
    href?: never;
  };

export type ButtonOrAnchorProps = AnchorProps | ButtonProps;

// ── Style helpers ─────────────────────────────────────────────────────────────
const BASE =
  "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const VARIANT: Record<NonNullable<SharedVisualProps["variant"]>, string> = {
  primary:   "bg-[#00ff88] text-black hover:bg-[#00cc6a] focus-visible:outline-[#00ff88]",
  secondary: "bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white/40",
};

const SIZE: Record<NonNullable<SharedVisualProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2   text-sm gap-2",
  lg: "px-6 py-3   text-base gap-2.5",
};

function buildClassName(
  variant: SharedVisualProps["variant"] = "primary",
  size: SharedVisualProps["size"] = "md",
  fullWidth: boolean = false,
  extra: string = "",
): string {
  return [BASE, VARIANT[variant], SIZE[size], fullWidth ? "w-full" : "", extra]
    .filter(Boolean)
    .join(" ");
}

// ── Component ─────────────────────────────────────────────────────────────────
export function Button(props: ButtonOrAnchorProps) {
  const { variant, size, fullWidth, className = "", children, ...rest } = props;
  const cls = buildClassName(variant, size, fullWidth, className);

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as Omit<AnchorProps, keyof SharedVisualProps | "className" | "children">;
    return (
      <a href={href} className={cls} {...anchorRest}>
        {children}
      </a>
    );
  }

  const buttonRest = rest as Omit<ButtonProps, keyof SharedVisualProps | "className" | "children">;
  return (
    <button className={cls} {...buttonRest}>
      {children}
    </button>
  );
}
