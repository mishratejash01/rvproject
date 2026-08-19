import { motion } from "framer-motion";
import { Banknote, ExternalLink, GraduationCap, Building2 } from "lucide-react";
import { Card, CardBody, Badge, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Jargon } from "@/components/Jargon";
import type { GrantMatch } from "@/lib/types";

/** Grant Radar — non-dilutive money, ranked for how reachable it is today. */
export function GrantPanel({
  matches,
  running,
  onRun,
  hasValidation,
}: {
  matches: GrantMatch[] | undefined;
  running: boolean;
  onRun: () => void;
  hasValidation: boolean;
}) {
  if (!matches?.length) {
    return (
      <Card>
        <EmptyState
          icon={<Banknote className="h-6 w-6" />}
          title="No grants matched yet"
          description={
            hasValidation
              ? "Find non-dilutive funding you can actually win as a student — NIDHI-PRAYAS, Startup India Seed Fund, Karnataka ELEVATE and more, with the exact eligibility route."
              : "Validate the idea first so grant fit can be assessed against your domain and stage."
          }
          action={
            <Button loading={running} onClick={onRun} disabled={!hasValidation}>
              Scan grant programmes
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
          <Jargon term="Non-dilutive Funding">Non-dilutive</Jargon> money — you keep 100% of your equity.
        </p>
        <Button variant="outline" size="sm" loading={running} onClick={onRun}>
          Re-scan
        </Button>
      </div>

      <div className="space-y-3">
        {matches.map((match, i) => {
          const grant = match.grant;
          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.35 }}
            >
              <Card>
                <CardBody>
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[0.9375rem] font-semibold tracking-tight text-ink">
                          {grant.name}
                        </h3>
                        <Badge tone="accent">{grant.amount_display}</Badge>
                        {grant.student_friendly && !grant.needs_registered_company && (
                          <Badge tone="good">
                            <GraduationCap className="h-3 w-3" />
                            No company needed
                          </Badge>
                        )}
                        {grant.needs_registered_company && (
                          <Badge tone="warn">
                            <Building2 className="h-3 w-3" />
                            Needs registered entity
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-[0.75rem] text-ink-faint">{grant.agency}</p>
                      <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink-mute">
                        {match.fit_rationale}
                      </p>

                      {match.eligibility_note && (
                        <div className="mt-3 rounded-lg border border-line bg-overlay/40 p-3">
                          <p className="text-[0.6875rem] font-medium tracking-wide text-ink-faint uppercase">
                            Eligibility
                          </p>
                          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-mute">
                            {match.eligibility_note}
                          </p>
                        </div>
                      )}

                      {match.next_step && (
                        <p className="mt-3 border-l-2 border-good/50 pl-3 text-[0.8125rem] leading-relaxed text-ink">
                          <span className="font-medium">Next step: </span>
                          {match.next_step}
                        </p>
                      )}

                      {grant.typical_timeline && (
                        <p className="mt-2.5 text-[0.75rem] text-ink-faint">{grant.typical_timeline}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="num text-lg font-semibold text-ink">{Math.round(match.fit_score)}</p>
                      <p className="text-[0.6875rem] text-ink-faint">fit score</p>
                    </div>
                  </div>

                  {grant.url && (
                    <div className="mt-4 border-t border-line pt-3.5">
                      <a href={grant.url} target="_blank" rel="noreferrer noopener">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Official programme page
                        </Button>
                      </a>
                    </div>
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
