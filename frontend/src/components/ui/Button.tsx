import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#04040e] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[#00ff88] text-[#04040e] font-semibold hover:bg-[#00e07a] shadow-[0_0_16px_rgba(0,255,136,0.25)] hover:shadow-[0_0_24px_rgba(0,255,136,0.4)]',
        destructive:
          'bg-[#ff3366] text-white hover:bg-[#cc2952]',
        outline:
          'border border-[rgba(255,255,255,0.12)] bg-transparent text-white hover:bg-[rgba(0,255,136,0.08)] hover:border-[rgba(0,255,136,0.35)] hover:text-[#00ff88]',
        secondary:
          'bg-[#101010] text-white border border-[rgba(255,255,255,0.08)] hover:bg-[#1a1a1a]',
        ghost:
          'text-white hover:bg-[rgba(0,255,136,0.08)] hover:text-[#00ff88]',
        link:
          'text-[#00ff88] underline-offset-4 hover:underline p-0 h-auto',
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
