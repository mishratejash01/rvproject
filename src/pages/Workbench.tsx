import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Flame, Target, Gauge, GitBranch, Presentation, Landmark,
  Banknote, TrendingUp, Users, Share2, FileText, Copy, Check,
} from "lucide-react";
import { useProject, useValidation, useInvestibility, usePivots, useDeck,
  useMatches, useGrantMatches, useBenchmarkLinks, useOutreachDrafts,
  useUpdateProject } from "@/hooks/useProjects";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Skeleton } from "@/components/ui/Card";
import { ValidationPanel } from "@/components/workbench/ValidationPanel";
import { InvestibilityPanel } from "@/components/workbench/InvestibilityPanel";
import { PivotPanel } from "@/components/workbench/PivotPanel";
import { DeckPanel } from "@/components/workbench/DeckPanel";
import { InvestorPanel } from "@/components/workbench/InvestorPanel";
import { GrantPanel } from "@/components/workbench/GrantPanel";
import { BenchmarkPanel } from "@/components/workbench/BenchmarkPanel";
import { WarRoom } from "@/components/workbench/WarRoom";
import { cn, copyToClipboard } from "@/lib/utils";

const TABS = [
  { key: "validation", label: "Validation", icon: Target },
  { key: "investibility", label: "Investibility", icon: Gauge },
  { key: "pivots", label: "Pivots", icon: GitBranch },
  { key: "deck", label: "Pitch deck", icon: Presentation },
  { key: "investors", label: "Investors", icon: Landmark },
  { key: "grants", label: "Grants", icon: Banknote },
  { key: "benchmarks", label: "Benchmarks", icon: TrendingUp },
  { key: "warroom", label: "War room", icon: Users },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Workbench() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("validation");
  const [running, setRunning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: project, isLoading, refetch: refetchProject } = useProject(id);
  const validation = useValidation(id);
  const investibility = useInvestibility(id);
  const pivots = usePivots(id);
  const deck = useDeck(id);
  const matches = useMatches(id);
  const grants = useGrantMatches(id);
  const benchmarks = useBenchmarkLinks(id);
  const drafts = useOutreachDrafts(id);
  const update = useUpdateProject(id ?? "");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card className="p-10 text-center">
        <p className="font-display text-[0.9375rem] font-semibold">Project not found</p>
        <p className="mt-1.5 text-[0.8125rem] text-ink-mute">
          It may have been deleted, or belong to another account.
        </p>
        <Link to="/dashboard" className="mt-5 inline-block">
          <Button variant="outline" size="sm">Back to workspace</Button>
        </Link>
      </Card>
    );
  }

  const roastMode = project.roast_mode;

  /** Runs a module, surfaces errors as toasts, refreshes the affected queries. */
  async function run(key: string, fn: () => Promise<unknown>, after: () => void) {
    setRunning(key);
    try {
      await fn();
      after();
      refetchProject();
      toast.success("Done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That run failed — try again.");
    } finally {
      setRunning(null);
    }
  }

  async function toggleShare() {
    const next = !project!.is_public;
    await update.mutateAsync({ is_public: next });
    if (next) {
      const url = `${window.location.origin}/p/${project!.share_slug}`;
      await copyToClipboard(url);
      toast.success("Public link copied to clipboard");
    } else {
      toast.success("Project is private again");
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-[0.8125rem] text-ink-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Workspace
      </button>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{project.title}</h1>
            <Badge tone="neutral">{project.domain?.name}</Badge>
            {project.is_public && <Badge tone="accent">Public</Badge>}
          </div>
          <p className="mt-2 max-w-3xl text-[0.875rem] leading-relaxed text-ink-mute">
            {project.problem_statement}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => update.mutate({ roast_mode: !roastMode })}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
              roastMode
                ? "border-bad/40 bg-bad-soft text-bad"
                : "border-line text-ink-mute hover:border-line-strong hover:text-ink",
            )}
            title="Switch the AI persona between supportive mentor and brutal VC partner"
          >
            <Flame className="h-3.5 w-3.5" />
            Roast mode {roastMode ? "on" : "off"}
          </button>

          <Button variant="outline" size="sm" onClick={toggleShare} loading={update.isPending}>
            <Share2 className="h-3.5 w-3.5" />
            {project.is_public ? "Shared" : "Share"}
          </Button>

          <Link to={`/project/${project.id}/pitchbook`}>
            <Button variant="outline" size="sm">
              <FileText className="h-3.5 w-3.5" />
              Pitch book
            </Button>
          </Link>
        </div>
      </div>

      {project.is_public && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-overlay/40 px-4 py-2.5">
          <span className="text-[0.75rem] text-ink-mute">Public link</span>
          <code className="num truncate text-[0.75rem] text-ink">
            {window.location.origin}/p/{project.share_slug}
          </code>
          <button
            className="ml-auto flex items-center gap-1.5 text-[0.75rem] text-ink-mute transition-colors hover:text-ink"
            onClick={async () => {
              await copyToClipboard(`${window.location.origin}/p/${project.share_slug}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? <Check className="h-3 w-3 text-good" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <span className="text-[0.75rem] text-ink-faint">{project.share_views} views</span>
        </div>
      )}

      <nav className="mt-7 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[0.8125rem] font-medium transition-colors",
              tab === key
                ? "border-accent text-ink"
                : "border-transparent text-ink-mute hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-6"
      >
        {tab === "validation" && (
          <ValidationPanel
            validation={validation.data}
            running={running === "validate"}
            roastMode={roastMode}
            onRun={() => run("validate", () => api.validate(project.id, roastMode), () => validation.refetch())}
          />
        )}

        {tab === "investibility" && (
          <InvestibilityPanel
            report={investibility.data}
            hasValidation={Boolean(validation.data)}
            running={running === "investibility"}
            onRun={() =>
              run("investibility", () => api.investibility(project.id, roastMode), () => investibility.refetch())
            }
          />
        )}

        {tab === "pivots" && (
          <PivotPanel
            pivots={pivots.data}
            projectId={project.id}
            hasValidation={Boolean(validation.data)}
            running={running === "pivots"}
            onRun={() => run("pivots", () => api.pivots(project.id, roastMode), () => pivots.refetch())}
          />
        )}

        {tab === "deck" && (
          <DeckPanel
            deck={deck.data}
            project={project}
            hasValidation={Boolean(validation.data)}
            running={running === "deck"}
            onRun={() => run("deck", () => api.deck(project.id), () => deck.refetch())}
          />
        )}

        {tab === "investors" && (
          <InvestorPanel
            matches={matches.data}
            drafts={drafts.data}
            projectId={project.id}
            hasValidation={Boolean(validation.data)}
            running={running === "matches"}
            onRun={() => run("matches", () => api.matches(project.id), () => matches.refetch())}
            onRefetchDrafts={() => drafts.refetch()}
          />
        )}

        {tab === "grants" && (
          <GrantPanel
            matches={grants.data}
            hasValidation={Boolean(validation.data)}
            running={running === "grants"}
            onRun={() => run("grants", () => api.grants(project.id), () => grants.refetch())}
          />
        )}

        {tab === "benchmarks" && (
          <BenchmarkPanel
            links={benchmarks.data}
            hasValidation={Boolean(validation.data)}
            running={running === "benchmarks"}
            onRun={() => run("benchmarks", () => api.benchmarks(project.id), () => benchmarks.refetch())}
          />
        )}

        {tab === "warroom" && (
          <WarRoom projectId={project.id} hasValidation={Boolean(validation.data)} />
        )}
      </motion.div>
    </div>
  );
}
