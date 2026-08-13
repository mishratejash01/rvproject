import { useState } from "react";
import { motion } from "framer-motion";
import { Presentation, Copy, Maximize2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody, Badge, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { copyToClipboard, cn } from "@/lib/utils";
import type { Deck, Project } from "@/lib/types";

function deckToMarkdown(deck: Deck, project: Project) {
  const lines = [`# ${project.title}`, "", deck.narrative_summary ?? "", ""];
  deck.slides.forEach((slide, i) => {
    lines.push(`## ${i + 1}. ${slide.title}`, "", `**${slide.headline}**`, "");
    slide.bullets.forEach((b) => lines.push(`- ${b}`));
    lines.push("", `> Speaker notes: ${slide.speaker_notes}`, "");
  });
  return lines.join("\n");
}

export function DeckPanel({
  deck,
  project,
  running,
  onRun,
  hasValidation,
}: {
  deck: Deck | null | undefined;
  project: Project;
  running: boolean;
  onRun: () => void;
  hasValidation: boolean;
}) {
  const [active, setActive] = useState(0);
  const [presenting, setPresenting] = useState(false);

  if (!deck) {
    return (
      <Card>
        <EmptyState
          icon={<Presentation className="h-6 w-6" />}
          title="No deck yet"
          description={
            hasValidation
              ? "Generate ten slides in YC and Sequoia order, built from your own validation numbers — not generic filler."
              : "Validate the idea first so the deck can quote real market numbers."
          }
          action={
            <Button loading={running} onClick={onRun} disabled={!hasValidation}>
              Generate pitch deck
            </Button>
          }
        />
      </Card>
    );
  }

  const slide = deck.slides[active];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-ink-mute">
          {deck.slides.length} slides · version {deck.version}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const ok = await copyToClipboard(deckToMarkdown(deck, project));
              toast[ok ? "success" : "error"](ok ? "Deck copied as markdown" : "Copy failed");
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy markdown
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPresenting(true)}>
            <Maximize2 className="h-3.5 w-3.5" />
            Present
          </Button>
          <Button variant="ghost" size="sm" loading={running} onClick={onRun}>
            Regenerate
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {deck.slides.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setActive(i)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors lg:w-full",
                i === active ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
              )}
            >
              <span className="num text-[0.6875rem] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
              <span className="truncate text-[0.8125rem] font-medium text-ink">{s.title}</span>
            </button>
          ))}
        </nav>

        <Card>
          <CardBody className="py-8">
            <motion.div key={slide.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Badge tone="neutral">{slide.key.replace(/_/g, " ")}</Badge>
              <h2 className="mt-4 font-display text-2xl leading-tight font-semibold tracking-tight text-ink">
                {slide.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink">{slide.headline}</p>
              <ul className="mt-6 space-y-2.5">
                {slide.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-[0.875rem] leading-relaxed text-ink-mute">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {b}
                  </li>
                ))}
              </ul>
              {slide.speaker_notes && (
                <div className="mt-7 border-t border-line pt-4">
                  <p className="text-[0.6875rem] font-medium tracking-wide text-ink-faint uppercase">
                    Speaker notes
                  </p>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-mute">{slide.speaker_notes}</p>
                </div>
              )}
            </motion.div>

            <div className="mt-7 flex items-center gap-2 border-t border-line pt-4">
              <Button variant="ghost" size="sm" disabled={active === 0} onClick={() => setActive(active - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="num text-[0.75rem] text-ink-faint">
                {active + 1} / {deck.slides.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                disabled={active === deck.slides.length - 1}
                onClick={() => setActive(active + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {presenting && (
        <PresentMode deck={deck} start={active} onClose={() => setPresenting(false)} />
      )}
    </div>
  );
}

/** Full-screen demo-day view with keyboard navigation. */
function PresentMode({ deck, start, onClose }: { deck: Deck; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const slide = deck.slides[index];

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === " ") setIndex((i) => Math.min(deck.slides.length - 1, i + 1));
    if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg outline-none"
      tabIndex={0}
      autoFocus
      onKeyDown={onKey}
      ref={(el) => el?.focus()}
    >
      <div className="flex items-center gap-4 border-b border-line px-6 py-3">
        <span className="num text-[0.75rem] text-ink-faint">
          {index + 1} / {deck.slides.length}
        </span>
        <span className="text-[0.75rem] text-ink-faint">Arrow keys to navigate · Esc to exit</span>
        <button className="ml-auto text-ink-mute hover:text-ink" onClick={onClose} aria-label="Exit presentation">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <motion.div
          key={slide.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-4xl"
        >
          <p className="text-[0.75rem] font-medium tracking-wide text-ink-faint uppercase">
            {slide.key.replace(/_/g, " ")}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-ink sm:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-6 text-xl leading-relaxed text-ink">{slide.headline}</p>
          <ul className="mt-9 space-y-4">
            {slide.bullets.map((b, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="flex gap-4 text-lg leading-relaxed text-ink-mute"
              >
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {b}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-line px-6 py-3">
        <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1">
          {deck.slides.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn("h-1 w-6 rounded-full transition-colors", i === index ? "bg-accent" : "bg-overlay")}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={index === deck.slides.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
