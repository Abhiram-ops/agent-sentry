import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * The single source of truth for page layout width and horizontal padding.
 * Uses the .container CSS class defined in globals.css.
 * Never override padding here — change the CSS variable instead.
 */
export function Container({
  children,
  className = "",
  as: Tag = "div",
}: ContainerProps) {
  return (
    <Tag className={`container ${className}`.trim()}>
      {children}
    </Tag>
  );
}
