import { motion } from "framer-motion";
import { TrendingUp, ExternalLink, Lightbulb } from "lucide-react";
import { Card, CardBody, Badge, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatUsd } from "@/lib/utils";
import type { BenchmarkLink } from "@/lib/types";

/** Live Indian startup benchmarks mapped onto this project. */
export function BenchmarkPanel({
  links,
  running,
  onRun,
  hasValidation,
}: {
  links: BenchmarkLink[] | undefined;
  running: boolean;
  onRun: () => void;
  hasValidation: boolean;
}) {
  if (!links?.length) {
    return (
      <Card>
        <EmptyState
          icon={<TrendingUp className="h-6 w-6" />}
          title="No benchmarks mapped yet"
          description={
            hasValidation
              ? "Compare your project against real Indian companies at their earliest stage — what stage zero looked like for them, and the one tactic worth copying."
              : "Validate the idea first so the comparison has substance."
          }
          action={
            <Button loading={running} onClick={onRun} disabled={!hasValidation}>
              Map to Indian benchmarks
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-ink-mute">
          Sourced and dated — every figure links to its reporting.
        </p>
        <Button variant="outline" size="sm" loading={running} onClick={onRun}>
          Re-map
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {links.map((link, i) => {
          const b = link.benchmark;
          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <Card className="h-full">
                <CardBody>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-[0.9375rem] font-semibold tracking-tight text-ink">
                      {b.startup_name}
                    </h3>
                    <Badge tone="neutral">{b.stage}</Badge>
                    {b.valuation_display && <Badge tone="accent">{b.valuation_display}</Badge>}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-ink-faint">
                    {b.founded_year && <span>Founded {b.founded_year}</span>}
                    {b.hq_city && <span>{b.hq_city}</span>}
                    {b.total_funding_usd && <span>Raised {formatUsd(b.total_funding_usd)}</span>}
                  </div>

                  {b.founding_story && (
                    <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-mute">{b.founding_story}</p>
                  )}

                  <div className="mt-4 border-t border-line pt-3.5">
                    <p className="text-[0.6875rem] font-medium tracking-wide text-ink-faint uppercase">
                      The parallel
                    </p>
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-mute">
                      {link.parallel_analysis}
                    </p>
                  </div>

                  {link.lesson && (
                    <div className="mt-3.5 flex gap-2.5 rounded-lg border border-line bg-overlay/40 p-3">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                      <p className="text-[0.8125rem] leading-relaxed text-ink">{link.lesson}</p>
                    </div>
                  )}

                  {b.source_url && (
                    <a
                      href={b.source_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] text-ink-faint transition-colors hover:text-ink-mute"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Source {b.as_of_date && `· as of ${b.as_of_date}`}
                    </a>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
