import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import { motion } from "framer-motion";
import { Gauge, RefreshCw, Quote } from "lucide-react";
import { Card, CardHeader, CardBody, Badge, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreBar } from "@/components/ScoreGauge";
import { Jargon } from "@/components/Jargon";
import type { InvestibilityReport } from "@/lib/types";

export function InvestibilityPanel({
  report,
  running,
  onRun,
  hasValidation,
}: {
  report: InvestibilityReport | null | undefined;
  running: boolean;
  onRun: () => void;
  hasValidation: boolean;
}) {
  if (!report) {
    return (
      <Card>
        <EmptyState
          icon={<Gauge className="h-6 w-6" />}
          title="No investment verdict yet"
          description={
            hasValidation
              ? "Run your project through the four filters a seed fund applies — founder-market fit, scalability, gross margins and barrier to entry."
              : "Validate the idea first, then the investment committee filter can run against real numbers."
          }
          action={
            <Button loading={running} onClick={onRun} disabled={!hasValidation}>
              Run investibility check
            </Button>
          }
        />
      </Card>
    );
  }

  const investible = report.verdict === "investible";
  const radarData = (report.filter_scores ?? []).map((f) => ({
    subject: f.label.replace(/ &.*/, ""),
    score: f.score,
  }));

  return (
    <div className="space-y-4">
      <Card className={investible ? "border-good/30" : "border-warn/30"}>
        <CardBody className="py-7">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={investible ? "good" : "warn"}>{report.verdict_label}</Badge>
            <span className="num text-[0.8125rem] text-ink-mute">
              Readiness {report.readiness_score}/100
            </span>
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3.5">
              {report.verdict_bullets?.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-3"
                >
                  <span className="num mt-0.5 text-[0.75rem] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-[0.875rem] font-medium text-ink">{b.title}</p>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-mute">{b.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {radarData.length >= 3 && (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="var(--lp-line)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "var(--lp-ink-mute)", fontSize: 10 }}
                    />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      dataKey="score"
                      stroke="var(--color-accent)"
                      fill="var(--color-accent)"
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="mt-5" loading={running} onClick={onRun}>
            <RefreshCw className="h-3.5 w-3.5" />
            Re-run verdict
          </Button>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="The four filters" description="How a seed partner scores this deal." />
          <CardBody className="space-y-4">
            {report.filter_scores?.map((f, i) => (
              <ScoreBar key={f.key} label={f.label} score={f.score} reasoning={f.reasoning} delay={i * 0.06} />
            ))}
          </CardBody>
        </Card>

        {report.investor_lens && (
          <Card>
            <CardHeader
              title="Partner meeting view"
              description="How this deal would be described internally."
            />
            <CardBody>
              <Quote className="h-4 w-4 text-ink-faint" />
              <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-mute italic">
                {report.investor_lens}
              </p>
              <p className="mt-4 text-[0.75rem] text-ink-faint">
                Terms like <Jargon term="Burn Rate">burn</Jargon>,{" "}
                <Jargon term="Runway">runway</Jargon> and{" "}
                <Jargon term="Moat">moat</Jargon> are explained on hover.
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
