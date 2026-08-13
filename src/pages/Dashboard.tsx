import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, FolderOpen, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui/Card";
import { relativeTime } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "accent" | "good" | "warn" }> = {
  draft: { label: "Draft", tone: "neutral" },
  validated: { label: "Validated", tone: "accent" },
  pivoted: { label: "Pivoted", tone: "warn" },
  deck_ready: { label: "Deck ready", tone: "good" },
  outreach: { label: "In outreach", tone: "good" },
};

export default function Dashboard() {
  const { data: projects, isLoading } = useProjects();
  const { profile } = useAuth();
  const remove = useDeleteProject();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Your workspace"}
          </h1>
          <p className="mt-1.5 text-[0.875rem] text-ink-mute">
            Every project you validate, pivot and pitch lives here.
          </p>
        </div>
        <Link to="/new">
          <Button>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        ) : !projects?.length ? (
          <Card>
            <EmptyState
              icon={<FolderOpen className="h-6 w-6" />}
              title="No projects yet"
              description="Start with the idea you are already building for a course, a hackathon or a lab. The workbench will tell you honestly whether it can become a company."
              action={
                <Link to="/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Validate your first idea
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => {
              const status = STATUS_LABEL[project.status] ?? STATUS_LABEL.draft;
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  <Card className="group flex h-full flex-col transition-colors hover:border-line-strong">
                    <Link to={`/project/${project.id}`} className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {project.is_public && (
                          <span className="flex items-center gap-1 text-[0.6875rem] text-ink-faint">
                            <Eye className="h-3 w-3" />
                            {project.share_views}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 font-display text-[0.9375rem] font-semibold tracking-tight text-ink">
                        {project.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-mute">
                        {project.problem_statement}
                      </p>
                    </Link>
                    <div className="flex items-center gap-3 border-t border-line px-5 py-3">
                      <span className="text-[0.75rem] text-ink-faint">{project.domain?.name}</span>
                      <span className="text-[0.75rem] text-ink-faint">·</span>
                      <span className="text-[0.75rem] text-ink-faint">{relativeTime(project.updated_at)}</span>
                      <button
                        className="ml-auto text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-bad"
                        aria-label="Delete project"
                        onClick={() => {
                          if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
                          remove.mutate(project.id, {
                            onSuccess: () => toast.success("Project deleted"),
                            onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
                          });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
