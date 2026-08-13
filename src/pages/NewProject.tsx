import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useDomains } from "@/hooks/useReference";
import { useCreateProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/Button";
import { Card, Skeleton } from "@/components/ui/Card";
import { Input, Textarea, Field } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

type Draft = {
  title: string;
  problem_statement: string;
  target_persona: string;
  technical_approach: string;
  domain_id: number | null;
};

const STEPS = [
  { key: "title", label: "The project" },
  { key: "problem", label: "The problem" },
  { key: "persona", label: "The user" },
  { key: "approach", label: "The approach" },
  { key: "domain", label: "The domain" },
] as const;

export default function NewProject() {
  const navigate = useNavigate();
  const { data: domains, isLoading } = useDomains();
  const create = useCreateProject();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    problem_statement: "",
    target_persona: "",
    technical_approach: "",
    domain_id: null,
  });

  const canAdvance = [
    draft.title.trim().length >= 2,
    draft.problem_statement.trim().length >= 40,
    draft.target_persona.trim().length >= 15,
    draft.technical_approach.trim().length >= 25,
    draft.domain_id !== null,
  ][step];

  function submit() {
    if (!draft.domain_id) return;
    create.mutate(
      { ...draft, domain_id: draft.domain_id },
      {
        onSuccess: (project) => {
          toast.success("Project created — run validation next.");
          navigate(`/project/${project.id}`);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create the project"),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-[0.8125rem] text-ink-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Workspace
      </button>

      <div className="mt-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Describe your idea</h1>
        <p className="mt-1.5 text-[0.875rem] text-ink-mute">
          Five questions. Be specific — vague inputs produce vague verdicts.
        </p>
      </div>

      <div className="mt-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < step ? "bg-accent" : i === step ? "bg-accent/60" : "bg-overlay",
            )}
          />
        ))}
      </div>

      <Card className="mt-6 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22 }}
          >
            {step === 0 && (
              <Field
                label="Project title"
                required
                hint="The working name of your project — you can rename it any time."
              >
                <Input
                  autoFocus
                  placeholder="e.g. MediQueue"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </Field>
            )}

            {step === 1 && (
              <Field
                label="What is broken today?"
                required
                hint="Describe the pain, not your solution. Who loses what — time, money, marks, safety — and how often?"
                counter={`${draft.problem_statement.trim().length} / 40 min`}
              >
                <Textarea
                  autoFocus
                  rows={5}
                  placeholder="Patients at government hospitals wait 3-5 hours with no visibility into wait times, so daily-wage workers lose a full day of income for a ten-minute consultation."
                  value={draft.problem_statement}
                  onChange={(e) => setDraft({ ...draft, problem_statement: e.target.value })}
                />
              </Field>
            )}

            {step === 2 && (
              <Field
                label="Who experiences this daily?"
                required
                hint="Be narrow. 'Everyone' scores badly; 'second-year CSE students at Bengaluru engineering colleges' scores well."
                counter={`${draft.target_persona.trim().length} / 15 min`}
              >
                <Textarea
                  autoFocus
                  rows={4}
                  placeholder="Daily-wage and lower-middle-income patients at government hospitals in tier-1 and tier-2 Indian cities."
                  value={draft.target_persona}
                  onChange={(e) => setDraft({ ...draft, target_persona: e.target.value })}
                />
              </Field>
            )}

            {step === 3 && (
              <Field
                label="How does your solution work?"
                required
                hint="The actual architecture — models, hardware, data, integrations. This drives the moat analysis."
                counter={`${draft.technical_approach.trim().length} / 25 min`}
              >
                <Textarea
                  autoFocus
                  rows={5}
                  placeholder="Computer-vision people counting at OPD entry points feeding a token-prediction model, surfaced through a WhatsApp bot so patients need no app install."
                  value={draft.technical_approach}
                  onChange={(e) => setDraft({ ...draft, technical_approach: e.target.value })}
                />
              </Field>
            )}

            {step === 4 && (
              <div>
                <p className="mb-3 text-[0.8125rem] font-medium text-ink">Pick the closest domain</p>
                {isLoading ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {domains?.map((domain) => {
                      const Icon = (Icons as any)[toPascal(domain.icon)] ?? Icons.Circle;
                      const selected = draft.domain_id === domain.id;
                      return (
                        <button
                          key={domain.id}
                          onClick={() => setDraft({ ...draft, domain_id: domain.id })}
                          className={cn(
                            "rounded-lg border p-3.5 text-left transition-colors",
                            selected
                              ? "border-accent bg-accent-soft"
                              : "border-line hover:border-line-strong",
                          )}
                        >
                          <Icon className={cn("h-4 w-4", selected ? "text-accent" : "text-ink-mute")} />
                          <p className="mt-2 text-[0.8125rem] font-medium text-ink">{domain.name}</p>
                          <p className="mt-0.5 text-[0.75rem] leading-relaxed text-ink-faint">
                            {domain.description}
                          </p>
                          {domain.example_startups && (
                            <p className="mt-1.5 text-[0.6875rem] text-ink-faint">{domain.example_startups}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 flex items-center gap-3 border-t border-line pt-5">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <span className="text-[0.75rem] text-ink-faint">
            Step {step + 1} of {STEPS.length}
          </span>
          <div className="ml-auto">
            {step < STEPS.length - 1 ? (
              <Button disabled={!canAdvance} onClick={() => setStep(step + 1)}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={!canAdvance} loading={create.isPending} onClick={submit}>
                <Sparkles className="h-4 w-4" />
                Create project
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Database stores lucide names in kebab-case; the icon set exports PascalCase. */
function toPascal(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
