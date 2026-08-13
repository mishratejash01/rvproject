import { useMemo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useGlossary } from "@/hooks/useReference";
import { cn } from "@/lib/utils";

/**
 * Jargon Defuser — hover any venture term for a plain-English definition served
 * from the glossary table. Definitions are never hardcoded in components.
 */
export function Jargon({ term, children, className }: { term: string; children?: React.ReactNode; className?: string }) {
  const { data: glossary } = useGlossary();

  const entry = useMemo(() => {
    if (!glossary) return null;
    const needle = term.toLowerCase().trim();
    return (
      glossary.find((g) => g.term.toLowerCase() === needle) ??
      // Combined entries such as "MRR & ARR" should still match a single term.
      glossary.find((g) => g.term.toLowerCase().split(/\s*&\s*|\s*\/\s*/).includes(needle)) ??
      null
    );
  }, [glossary, term]);

  const label = children ?? term;
  if (!entry) return <span className={className}>{label}</span>;

  return (
    <Tooltip.Root delayDuration={120}>
      <Tooltip.Trigger asChild>
        <span
          className={cn(
            "cursor-help underline decoration-dotted decoration-ink-faint underline-offset-4 hover:decoration-accent",
            className,
          )}
        >
          {label}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 max-w-xs rounded-lg border border-line-strong bg-raised p-3 shadow-xl animate-rise"
        >
          <p className="font-display text-[0.8125rem] font-semibold text-ink">{entry.term}</p>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-mute">{entry.short_def}</p>
          {entry.example && (
            <p className="mt-2 border-t border-line pt-2 text-[0.7rem] leading-relaxed text-ink-faint">
              {entry.example}
            </p>
          )}
          <Tooltip.Arrow className="fill-[var(--lp-line-strong)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function JargonProvider({ children }: { children: React.ReactNode }) {
  return <Tooltip.Provider delayDuration={120}>{children}</Tooltip.Provider>;
}
