import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { useGlossary } from "@/hooks/useReference";
import { Card, Badge, Skeleton } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "fundraising", label: "Fundraising" },
  { key: "market_sizing", label: "Market sizing" },
  { key: "metrics", label: "Metrics" },
  { key: "product", label: "Product" },
  { key: "legal_equity", label: "Legal & equity" },
  { key: "gtm", label: "Go-to-market" },
  { key: "vc_speak", label: "VC speak" },
];

/** The full jargon reference — the same rows that power hover tooltips. */
export default function Glossary() {
  const { data: terms, isLoading } = useGlossary();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>();

  const filtered = useMemo(() => {
    if (!terms) return [];
    const q = query.toLowerCase().trim();
    return terms.filter((t) => {
      if (category && t.category !== category) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.short_def.toLowerCase().includes(q) ||
        t.long_def.toLowerCase().includes(q)
      );
    });
  }, [terms, query, category]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-accent" />
        <h1 className="font-display text-2xl font-semibold tracking-tight">Venture glossary</h1>
      </div>
      <p className="mt-1.5 text-[0.875rem] text-ink-mute">
        Every term the workbench uses, in plain English with Indian examples.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <Input
            className="pl-9"
            placeholder="Search terms…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="num text-[0.75rem] text-ink-faint">{filtered.length} terms</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(undefined)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-[0.75rem] font-medium transition-colors",
            !category ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-mute hover:text-ink",
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[0.75rem] font-medium transition-colors",
              category === c.key ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-mute hover:text-ink",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {isLoading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)
          : filtered.map((t) => (
              <Card key={t.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-[0.9375rem] font-semibold tracking-tight text-ink">{t.term}</h3>
                  <Badge tone="neutral">{t.category.replace(/_/g, " ")}</Badge>
                </div>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink">{t.short_def}</p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-mute">{t.long_def}</p>
                {t.example && (
                  <p className="mt-3 border-l-2 border-line-strong pl-3 text-[0.8125rem] leading-relaxed text-ink-faint">
                    {t.example}
                  </p>
                )}
                {t.related_terms?.length > 0 && (
                  <p className="mt-3 text-[0.75rem] text-ink-faint">
                    Related: {t.related_terms.join(", ")}
                  </p>
                )}
              </Card>
            ))}
      </div>
    </div>
  );
}
