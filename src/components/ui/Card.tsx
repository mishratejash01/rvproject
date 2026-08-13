import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h3 className="font-display text-[0.9375rem] font-semibold tracking-tight text-ink">{title}</h3>
        {description && <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-mute">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "good" | "warn" | "bad";
  className?: string;
}) {
  const tones = {
    neutral: "bg-overlay text-ink-mute border-line",
    accent: "bg-accent-soft text-accent border-accent/25",
    good: "bg-good-soft text-good border-good/25",
    warn: "bg-warn-soft text-warn border-warn/25",
    bad: "bg-bad-soft text-bad border-bad/25",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.6875rem] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Loading placeholder that matches the surface it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-overlay", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <p className="font-display text-[0.9375rem] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-ink-mute">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
