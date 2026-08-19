import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, ExternalLink } from "lucide-react";
import { useLeaderboard, useCampuses, useDomains } from "@/hooks/useReference";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui/Card";
import { cn, scoreColor } from "@/lib/utils";

/** Campus leaderboard — only projects their founders chose to make public. */
export default function Leaderboard() {
  const [campus, setCampus] = useState<string | undefined>();
  const [domain, setDomain] = useState<string | undefined>();
  const { data: rows, isLoading } = useLeaderboard(campus, domain);
  const { data: campuses } = useCampuses();
  const { data: domains } = useDomains();

  return (
    <div>
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-accent" />
        <h1 className="font-display text-2xl font-semibold tracking-tight">Campus leaderboard</h1>
      </div>
      <p className="mt-1.5 text-[0.875rem] text-ink-mute">
        Public projects across RV Institutions, ranked by validation score.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Filter active={!campus} onClick={() => setCampus(undefined)}>All campuses</Filter>
        {campuses?.map((c) => (
          <Filter key={c.id} active={campus === c.short_name} onClick={() => setCampus(c.short_name)}>
            {c.short_name}
          </Filter>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Filter active={!domain} onClick={() => setDomain(undefined)}>All domains</Filter>
        {domains?.map((d) => (
          <Filter key={d.id} active={domain === d.slug} onClick={() => setDomain(d.slug)}>
            {d.name}
          </Filter>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : !rows?.length ? (
          <Card>
            <EmptyState
              icon={<Trophy className="h-6 w-6" />}
              title="Nothing published yet"
              description="Projects appear here once their founders switch on sharing from the workbench."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((row, i) => (
              <motion.div
                key={row.project_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Link to={`/p/${row.share_slug}`}>
                  <Card className="flex items-center gap-4 p-4 transition-colors hover:border-line-strong">
                    <span className="num w-7 shrink-0 text-center text-[0.875rem] font-semibold text-ink-faint">
                      {i + 1}
                    </span>
                    <div
                      className="num flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[0.9375rem] font-semibold"
                      style={{ color: scoreColor(row.viability_score), background: "var(--lp-overlay)" }}
                    >
                      {row.viability_score}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-[0.9375rem] font-semibold tracking-tight text-ink">
                          {row.title}
                        </p>
                        <Badge tone={row.pain_classification === "painkiller" ? "good" : "neutral"}>
                          {row.pain_classification}
                        </Badge>
                        {row.verdict === "investible" && <Badge tone="accent">Investible</Badge>}
                      </div>
                      {row.headline && (
                        <p className="mt-1 line-clamp-1 text-[0.8125rem] text-ink-mute">{row.headline}</p>
                      )}
                      <p className="mt-1 text-[0.75rem] text-ink-faint">
                        {[row.founder_name, row.campus, row.domain_name].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Filter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-[0.75rem] font-medium transition-colors",
        active ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-mute hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
