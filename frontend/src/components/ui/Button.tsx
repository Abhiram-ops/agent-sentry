import React from 'react';

// Create a union type for the two possible states
type ButtonProps = 
  | (React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: "primary" | "secondary" })
  | (React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never; variant?: "primary" | "secondary" });

export function Button({ 
  children, 
  href, 
  variant = "primary", 
  style, 
  className = "", 
  ...props 
}: ButtonProps) {
  
  const baseClass = "inline-flex items-center justify-center transition-all duration-200 font-medium";
  const variantClass = variant === "primary" ? "bg-[#00ff88] text-black hover:bg-[#00cc6a]" : "bg-white/10 text-white hover:bg-white/20";
  
  if (href) {
    return (
      <a href={href} style={style} className={`${baseClass} ${variantClass} ${className}`} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button style={style} className={`${baseClass} ${variantClass} ${className}`} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}