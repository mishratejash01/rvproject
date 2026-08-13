import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint ring-focus transition-colors focus:border-line-strong";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, "h-9.5", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, "min-h-24 resize-y leading-relaxed", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  counter,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  counter?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[0.8125rem] font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-ink-faint">*</span>}
        </span>
        {counter && <span className="num text-[0.6875rem] text-ink-faint">{counter}</span>}
      </div>
      {children}
      {hint && !error && <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-faint">{hint}</p>}
      {error && <p className="mt-1.5 text-[0.75rem] text-bad">{error}</p>}
    </label>
  );
}
