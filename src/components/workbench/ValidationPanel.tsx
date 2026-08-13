import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, RefreshCw, Sparkles, ShieldAlert, ShieldCheck } from "lucide-react";
import { ScoreGauge, ScoreBar } from "@/components/ScoreGauge";
import { Jargon } from "@/components/Jargon";
import { Card, CardHeader, CardBody, Badge, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatUsd } from "@/lib/utils";
import type { Validation } from "@/lib/types";

export function ValidationPanel({
  validation,
  running,
  onRun,
  roastMode,
}: {
  validation: Validation | null | undefined;
  running: boolean;
  onRun: () => void;
  roastMode: boolean;
}) {
  if (!validation) {
    return (
      <Card>
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="Not validated yet"
          description="Score this idea against pain severity, market urgency, solution fit, feasibility, defensibility and timing — then get a defensible market size."
          action={
            <Button loading={running} onClick={onRun}>
              {roastMode ? "Roast this idea" : "Run validation"}
            </Button>
          }
        />
      </Card>
    );
  }

  const painkiller = validation.pain_classification === "painkiller";
  const market = validation.market_sizing ?? ({} as Validation["market_sizing"]);
  const weaknesses = validation.full_report?.weaknesses ?? [];
  const strengths = validation.full_report?.strengths ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-col items-center gap-6 py-8 sm:flex-row sm:items-start sm:gap-10">
          <ScoreGauge score={validation.viability_score} label="Viability" sublabel={`v${validation.version}`} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge tone={painkiller ? "good" : "warn"}>
                {painkiller ? "Painkiller" : "Vitamin"}
              </Badge>
              {validation.defensibility?.is_wrapper && <Badge tone="bad">Wrapper risk</Badge>}
              {validation.roast_mode && <Badge tone="bad">Roasted</Badge>}
            </div>
            <h2 className="mt-3 font-display text-lg leading-snug font-semibold tracking-tight text-ink">
              {validation.headline}
            </h2>
            <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-mute">{validation.summary}</p>
            <Button variant="outline" size="sm" className="mt-4" loading={running} onClick={onRun}>
              <RefreshCw className="h-3.5 w-3.5" />
              Re-run validation
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Rubric breakdown" description="Weighted criteria behind the composite score." />
          <CardBody className="space-y-4">
            {validation.sub_scores?.map((s, i) => (
              <ScoreBar key={s.key} label={s.label} score={s.score} reasoning={s.reasoning} delay={i * 0.06} />
            ))}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Market size"
              description="Bottom-up estimates you can defend in a partner meeting."
            />
            <CardBody className="space-y-3.5">
              {(["tam", "sam", "som"] as const).map((key) => {
                const leg = market?.[key];
                if (!leg) return null;
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <Jargon term={key.toUpperCase()} className="text-[0.8125rem] font-medium text-ink" />
                      <span className="num text-[0.9375rem] font-semibold text-ink">
                        {leg.display || formatUsd(leg.value_usd)}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-faint">{leg.method}</p>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={<span className="flex items-center gap-2">
                {validation.defensibility?.is_wrapper ? (
                  <ShieldAlert className="h-4 w-4 text-bad" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-good" />
                )}
                Defensibility
              </span>}
              action={<Badge tone="neutral">{(validation.defensibility?.moat_type ?? "none").replace(/_/g, " ")}</Badge>}
            />
            <CardBody>
              <p className="text-[0.8125rem] leading-relaxed text-ink-mute">
                {validation.defensibility?.analysis}
              </p>
              {validation.defensibility?.replication_risks?.length > 0 && (
                <div className="mt-4">
                  <p className="text-[0.75rem] font-medium tracking-wide text-ink-faint uppercase">
                    Replication risks
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {validation.defensibility.replication_risks.map((risk, i) => (
                      <li key={i} className="flex gap-2 text-[0.8125rem] leading-relaxed text-ink-mute">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Weaknesses" description="These drive the pivot matrix." />
          <CardBody className="space-y-3.5">
            {weaknesses.map((w, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-3"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                <div>
                  <p className="text-[0.8125rem] font-medium text-ink">{w.title}</p>
                  <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-mute">{w.detail}</p>
                </div>
              </motion.div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Strengths" description="What to double down on." />
          <CardBody className="space-y-3.5">
            {strengths.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                <div>
                  <p className="text-[0.8125rem] font-medium text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-mute">{s.detail}</p>
                </div>
              </motion.div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
