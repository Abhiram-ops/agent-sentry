import React from 'react';

// Using 'any' for the underlying HTML types silences the property collision errors
// while still giving you full flexibility for your 'href' or 'variant' props.
interface ButtonProps extends React.ButtonHTMLAttributes<any> {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
}

export function Button({ 
  children, 
  href, 
  variant = "primary", 
  className = "", 
  ...props 
}: ButtonProps) {
  
  const baseClass = "inline-flex items-center justify-center transition-all duration-200 font-medium";
  const variantClass = variant === "primary" ? "bg-[#00ff88] text-black hover:bg-[#00cc6a]" : "bg-white/10 text-white hover:bg-white/20";
  
  // If href is present, render as an anchor
  if (href) {
    return (
      <a href={href} className={`${baseClass} ${variantClass} ${className}`} {...(props as any)}>
        {children}
      </a>
    );
  }

  // Otherwise, render as a button
  return (
    <button className={`${baseClass} ${variantClass} ${className}`} {...(props as any)}>
      {children}
    </button>
  );
}