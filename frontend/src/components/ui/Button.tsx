import React from 'react';

// 1. Define the base types correctly
type ButtonBaseProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
type AnchorBaseProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

// 2. Define the Union Type correctly
type ButtonProps = 
  | (AnchorBaseProps & { href: string; variant?: "primary" | "secondary"; size?: string })
  | (ButtonBaseProps & { href?: never; variant?: "primary" | "secondary"; size?: string });

// 3. The Function
export function Button({ 
  children, 
  href, 
  variant = "primary", 
  className = "", 
  size, 
  ...props 
}: ButtonProps) {
  
  const baseClass = "inline-flex items-center justify-center transition-all duration-200 font-medium";
  const variantClass = variant === "primary" 
  ? "bg-[#00ff88] text-black hover:bg-[#00cc6a]" 
  : "bg-white/10 text-white hover:bg-white/20";
  
  if (href) {
    return (
      <a href={href} className={`${baseClass} ${variantClass} ${className}`} {...(props as AnchorBaseProps)}>
        {children}
      </a>
    );
  }

  return (
    <button className={`${baseClass} ${variantClass} ${className}`} {...(props as ButtonBaseProps)}>
      {children}
    </button>
  );
}