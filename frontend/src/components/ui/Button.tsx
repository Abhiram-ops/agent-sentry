import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] shadow-[0_4px_14px_rgba(29,78,216,0.25)] hover:shadow-[0_4px_18px_rgba(29,78,216,0.35)]',
        destructive:
          'bg-[#ef4444] text-white hover:bg-[#dc2626]',
        outline:
          'border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--bg-subtle)] hover:border-[#cbd5e1]',
        secondary:
          'bg-[var(--bg-subtle)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--accent-subtle)]',
        ghost:
          'text-[var(--text)] hover:bg-[var(--bg-subtle)]',
        link:
          'text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-9 rounded-md px-3 text-xs',
        lg:      'h-11 rounded-md px-8',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?:   boolean;
  /** Renders an <a> tag when provided — backward-compat with old Button usage */
  href?:      string;
  target?:    string;
  rel?:       string;
  /** Backward-compat: adds w-full */
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, href, target, rel, fullWidth, children, ...props }, ref) => {
    const cls = cn(buttonVariants({ variant, size, className }), fullWidth && 'w-full');

    // Render as anchor when href is passed directly (backward compat)
    if (href) {
      return (
        <a href={href} target={target} rel={rel} className={cls}>
          {children}
        </a>
      );
    }

    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cls} ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
