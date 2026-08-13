import { motion } from "framer-motion";
import { GitBranch, TrendingUp, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody, Badge, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAdoptPivot } from "@/hooks/useProjects";
import type { Pivot } from "@/lib/types";

const DIFFICULTY: Record<string, { tone: "good" | "warn" | "bad"; label: string }> = {
  low: { tone: "good", label: "Low effort" },
  medium: { tone: "warn", label: "One quarter" },
  high: { tone: "bad", label: "New core tech" },
};

export function PivotPanel({
  pivots,
  projectId,
  running,
  onRun,
  hasValidation,
}: {
  pivots: Pivot[] | undefined;
  projectId: string;
  running: boolean;
  onRun: () => void;
  hasValidation: boolean;
}) {
  const adopt = useAdoptPivot(projectId);

  if (!pivots?.length) {
    return (
      <Card>
        <EmptyState
          icon={<GitBranch className="h-6 w-6" />}
          title="No pivots generated"
          description={
            hasValidation
              ? "Generate three strategic pivots aimed squarely at the weaknesses the validation found. Adopt one and the project re-scores against the new thesis."
              : "Validate the idea first — pivots are engineered from the specific weaknesses it uncovers."
          }
          action={
            <Button loading={running} onClick={onRun} disabled={!hasValidation}>
              Generate pivot matrix
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
          Three routes out of the weaknesses found. Adopting one rewrites the project thesis.
        </p>
        <Button variant="outline" size="sm" loading={running} onClick={onRun}>
          Regenerate
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {pivots.map((pivot, i) => {
          const diff = DIFFICULTY[pivot.difficulty] ?? DIFFICULTY.medium;
          return (
            <motion.div
              key={pivot.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
            >
              <Card className={pivot.adopted ? "flex h-full flex-col border-accent/40" : "flex h-full flex-col"}>
                <CardBody className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={diff.tone}>{diff.label}</Badge>
                    {pivot.expected_score_delta > 0 && (
                      <Badge tone="accent">
                        <TrendingUp className="h-3 w-3" />
                        +{pivot.expected_score_delta} projected
                      </Badge>
                    )}
                    {pivot.adopted && (
                      <Badge tone="good">
                        <Check className="h-3 w-3" />
                        Adopted
                      </Badge>
                    )}
                  </div>

                  <h3 className="mt-3 font-display text-[0.9375rem] leading-snug font-semibold tracking-tight text-ink">
                    {pivot.title}
                  </h3>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-mute">{pivot.pivot_thesis}</p>

                  <dl className="mt-4 space-y-3 border-t border-line pt-4">
                    <div>
                      <dt className="text-[0.6875rem] font-medium tracking-wide text-ink-faint uppercase">
                        What changes
                      </dt>
                      <dd className="mt-1 text-[0.8125rem] leading-relaxed text-ink-mute">{pivot.what_changes}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.6875rem] font-medium tracking-wide text-ink-faint uppercase">
                        New market
                      </dt>
                      <dd className="mt-1 text-[0.8125rem] leading-relaxed text-ink-mute">{pivot.target_market}</dd>
                    </div>
                    {pivot.business_model_shift && (
                      <div>
                        <dt className="text-[0.6875rem] font-medium tracking-wide text-ink-faint uppercase">
                          Model shift
                        </dt>
                        <dd className="mt-1 text-[0.8125rem] leading-relaxed text-ink-mute">
                          {pivot.business_model_shift}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[0.6875rem] font-medium tracking-wide text-ink-faint uppercase">
                        Why it beats the current path
                      </dt>
                      <dd className="mt-1 text-[0.8125rem] leading-relaxed text-ink-mute">{pivot.rationale}</dd>
                    </div>
                  </dl>
                </CardBody>

                {!pivot.adopted && (
                  <div className="border-t border-line px-5 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      loading={adopt.isPending && adopt.variables?.id === pivot.id}
                      onClick={() => {
                        if (!confirm(`Adopt "${pivot.title}"? This rewrites your project thesis — re-run validation afterwards to see the new score.`)) return;
                        adopt.mutate(pivot, {
                          onSuccess: () => toast.success("Pivot adopted — re-run validation to score it."),
                          onError: (e) => toast.error(e instanceof Error ? e.message : "Could not adopt"),
                        });
                      }}
                    >
                      Adopt this pivot
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
