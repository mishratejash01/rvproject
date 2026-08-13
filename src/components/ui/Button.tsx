import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-lg transition-colors ring-focus disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-invert text-invert-ink hover:opacity-88",
        accent: "bg-accent text-white hover:bg-accent/88",
        outline: "border border-line-strong text-ink hover:bg-overlay",
        ghost: "text-ink-mute hover:text-ink hover:bg-overlay",
        danger: "border border-bad/40 text-bad hover:bg-bad-soft",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem]",
        md: "h-9.5 px-4 text-sm",
        lg: "h-11 px-6 text-[0.9375rem]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
