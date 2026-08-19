import { useMemo, useState } from "react";
import { Landmark, Search, ExternalLink, GraduationCap } from "lucide-react";
import { useInvestors, useDomains } from "@/hooks/useReference";
import { Card, Badge, Skeleton } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

/** Browsable directory of every fund in the database, independent of a project. */
export default function Investors() {
  const { data: investors, isLoading } = useInvestors();
  const { data: domains } = useDomains();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string | undefined>();
  const [studentsOnly, setStudentsOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!investors) return [];
    const q = query.toLowerCase().trim();
    return investors.filter((inv) => {
      if (studentsOnly && !inv.works_with_student_founders) return false;
      if (sector && !inv.sectors?.includes(sector) && !inv.sectors?.includes("sector_agnostic")) return false;
      if (!q) return true;
      return (
        inv.name.toLowerCase().includes(q) ||
        inv.thesis.toLowerCase().includes(q) ||
        (inv.hq_city ?? "").toLowerCase().includes(q) ||
        inv.notable_portfolio?.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [investors, query, sector, studentsOnly]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-accent" />
        <h1 className="font-display text-2xl font-semibold tracking-tight">Investor directory</h1>
      </div>
      <p className="mt-1.5 text-[0.875rem] text-ink-mute">
        Active Indian early-stage funds, micro-VCs, angel networks and accelerators — with cheque sizes and theses.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <Input
            className="pl-9"
            placeholder="Search funds, theses, portfolio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setStudentsOnly(!studentsOnly)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.75rem] font-medium transition-colors",
            studentsOnly ? "border-good/40 bg-good-soft text-good" : "border-line text-ink-mute hover:text-ink",
          )}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Backs student founders
        </button>
        <span className="num text-[0.75rem] text-ink-faint">{filtered.length} funds</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setSector(undefined)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-[0.75rem] font-medium transition-colors",
            !sector ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-mute hover:text-ink",
          )}
        >
          All sectors
        </button>
        {domains?.map((d) => (
          <button
            key={d.id}
            onClick={() => setSector(d.slug)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[0.75rem] font-medium transition-colors",
              sector === d.slug ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-mute hover:text-ink",
            )}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {isLoading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)
          : filtered.map((inv) => (
              <Card key={inv.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-[0.9375rem] font-semibold tracking-tight text-ink">{inv.name}</h3>
                  <Badge tone="neutral">{inv.firm_type.replace(/_/g, " ")}</Badge>
                  {inv.works_with_student_founders && (
                    <Badge tone="good">
                      <GraduationCap className="h-3 w-3" />
                      Students
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-mute">{inv.thesis}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-ink-faint">
                  {inv.cheque_display && <span>{inv.cheque_display}</span>}
                  {inv.hq_city && <span>{inv.hq_city}</span>}
                  {inv.stages?.length > 0 && <span>{inv.stages.join(", ").replace(/_/g, "-")}</span>}
                </div>
                {inv.notable_portfolio?.length > 0 && (
                  <p className="mt-2 line-clamp-1 text-[0.75rem] text-ink-faint">
                    {inv.notable_portfolio.slice(0, 5).join(" · ")}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3">
                  {inv.apply_url && (
                    <a
                      href={inv.apply_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-1.5 text-[0.75rem] text-ink-mute transition-colors hover:text-ink"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Apply
                    </a>
                  )}
                  {inv.website && (
                    <a
                      href={inv.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-1.5 text-[0.75rem] text-ink-mute transition-colors hover:text-ink"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Website
                    </a>
                  )}
                </div>
              </Card>
            ))}
      </div>
    </div>
  );
}
