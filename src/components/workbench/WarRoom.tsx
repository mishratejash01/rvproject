import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Users, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };

const OPENERS: Record<Mode, string[]> = {
  ic_panel: [
    "We are ready — start the questions.",
    "Our go-to-market is campus-first, then city-wide.",
    "We have no revenue yet, but strong pilot interest.",
  ],
  roast: [
    "Tear this idea apart.",
    "What is the single biggest reason you would pass?",
    "Is this a real company or a class project?",
  ],
};

type Mode = "roast" | "ic_panel";

/**
 * Live defence sandbox. Two personas share one streaming transport: Roast Mode
 * (single brutal partner) and the IC Panel (three partners taking turns).
 */
export function WarRoom({ projectId, hasValidation }: { projectId: string; hasValidation: boolean }) {
  const [mode, setMode] = useState<Mode>("ic_panel");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, streaming]);

  // Switching persona starts a fresh conversation.
  function switchMode(next: Mode) {
    if (streaming || next === mode) return;
    setMode(next);
    setTurns([]);
    setSessionId(null);
  }

  async function send(message: string) {
    if (!message.trim() || streaming) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const { sessionId: newSession } = await api.chat(
        { projectId, message, mode, sessionId },
        (chunk) => {
          setTurns((t) => {
            const next = [...t];
            next[next.length - 1] = {
              role: "assistant",
              content: next[next.length - 1].content + chunk,
            };
            return next;
          });
        },
      );
      if (newSession) setSessionId(newSession);
    } catch (err) {
      setTurns((t) => t.slice(0, -2));
      toast.error(err instanceof Error ? err.message : "The session dropped — try again.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <Card className="flex h-[640px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <button
          onClick={() => switchMode("ic_panel")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
            mode === "ic_panel" ? "bg-accent-soft text-accent" : "text-ink-mute hover:text-ink",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Investment committee
        </button>
        <button
          onClick={() => switchMode("roast")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
            mode === "roast" ? "bg-bad-soft text-bad" : "text-ink-mute hover:text-ink",
          )}
        >
          <Flame className="h-3.5 w-3.5" />
          Roast mode
        </button>
        {turns.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={streaming}
            onClick={() => {
              setTurns([]);
              setSessionId(null);
            }}
          >
            New session
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {turns.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            {mode === "ic_panel" ? (
              <>
                <Users className="h-6 w-6 text-ink-faint" />
                <p className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                  Three partners are waiting
                </p>
                <p className="mt-1.5 max-w-md text-[0.8125rem] leading-relaxed text-ink-mute">
                  Meera attacks acquisition cost and distribution. Arjun attacks the technical moat.
                  Kavya attacks burn, runway and your market arithmetic. They follow up on weak answers,
                  and close with a fund-or-pass verdict.
                </p>
              </>
            ) : (
              <>
                <Flame className="h-6 w-6 text-bad" />
                <p className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                  No encouragement here
                </p>
                <p className="mt-1.5 max-w-md text-[0.8125rem] leading-relaxed text-ink-mute">
                  A Tier-1 partner with no patience for vanity metrics. Every criticism is concrete,
                  and every one comes with what a serious founder would do instead.
                </p>
              </>
            )}

            {!hasValidation && (
              <Badge tone="warn" className="mt-4">
                Validate first for a sharper session
              </Badge>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {OPENERS[mode].map((opener) => (
                <button
                  key={opener}
                  onClick={() => send(opener)}
                  className="rounded-lg border border-line px-3 py-1.5 text-[0.75rem] text-ink-mute transition-colors hover:border-line-strong hover:text-ink"
                >
                  {opener}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3 text-[0.875rem] leading-relaxed",
                  turn.role === "user"
                    ? "bg-overlay text-ink"
                    : mode === "roast"
                      ? "border border-bad/25 bg-bad-soft text-ink"
                      : "border border-line bg-raised text-ink",
                )}
              >
                {turn.content ? (
                  <PartnerText text={turn.content} />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-line px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          placeholder={mode === "roast" ? "Defend your idea…" : "Answer the committee…"}
          value={input}
          disabled={streaming}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" size="icon" disabled={streaming || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

/** Renders **Partner:** prefixes as emphasised speaker labels. */
function PartnerText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-display font-semibold text-accent">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
