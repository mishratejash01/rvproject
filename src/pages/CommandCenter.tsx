import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { ShieldCheck, Users, FolderKanban, Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardBody, Badge, Skeleton } from "@/components/ui/Card";
import { scoreColor, relativeTime } from "@/lib/utils";

/**
 * Faculty and incubation-cell view: cohort health across the institution.
 * Admin-gated in the UI and enforced again by RLS on every underlying table.
 */
export default function CommandCenter() {
  const { isAdmin, loading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["command-center"],
    enabled: isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const [projects, leaderboard, activity, profiles] = await Promise.all([
        supabase.from("projects").select("id, title, status, domain_id, created_at, domain:domains(name, slug)"),
        supabase.from("leaderboard").select("*").order("viability_score", { ascending: false }),
        supabase.from("activity_log").select("event_type, created_at, meta").order("created_at", { ascending: false }).limit(40),
        supabase.from("profiles").select("id, campus_id, created_at, campus:campuses(short_name)"),
      ]);
      return {
        projects: projects.data ?? [],
        leaderboard: leaderboard.data ?? [],
        activity: activity.data ?? [],
        profiles: profiles.data ?? [],
      };
    },
  });

  if (loading) return <Skeleton className="h-64" />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const domainCounts = new Map<string, number>();
  data.projects.forEach((p: any) => {
    const name = p.domain?.name ?? "Unassigned";
    domainCounts.set(name, (domainCounts.get(name) ?? 0) + 1);
  });
  const domainData = [...domainCounts.entries()].map(([name, count]) => ({ name, count }));

  const scored = data.leaderboard.filter((r: any) => typeof r.viability_score === "number");
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum: number, r: any) => sum + r.viability_score, 0) / scored.length)
    : 0;
  const investible = data.leaderboard.filter((r: any) => r.verdict === "investible").length;

  const bands = [
    { label: "0–44", min: 0, max: 44 },
    { label: "45–69", min: 45, max: 69 },
    { label: "70–100", min: 70, max: 100 },
  ].map((b) => ({
    ...b,
    count: scored.filter((r: any) => r.viability_score >= b.min && r.viability_score <= b.max).length,
  }));

  return (
    <div>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <h1 className="font-display text-2xl font-semibold tracking-tight">RV Command Center</h1>
      </div>
      <p className="mt-1.5 text-[0.875rem] text-ink-mute">
        Cohort health across the institution — what students are building and how far it has travelled.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Users className="h-4 w-4" />} label="Founders onboarded" value={data.profiles.length} />
        <Metric icon={<FolderKanban className="h-4 w-4" />} label="Projects created" value={data.projects.length} />
        <Metric icon={<Sparkles className="h-4 w-4" />} label="Average viability" value={avgScore || "—"} />
        <Metric icon={<Trophy className="h-4 w-4" />} label="Investible verdicts" value={investible} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Domain distribution" description="Where the cohort is concentrating." />
          <CardBody>
            {domainData.length === 0 ? (
              <p className="py-8 text-center text-[0.8125rem] text-ink-faint">No projects yet.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domainData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={92}
                      tick={{ fill: "var(--lp-ink-mute)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--lp-overlay)" }}
                      contentStyle={{
                        background: "var(--lp-raised)",
                        border: "1px solid var(--lp-line-strong)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Score distribution" description="How rigorous the cohort's ideas are." />
          <CardBody className="space-y-4 py-6">
            {bands.map((b) => {
              const pct = scored.length ? (b.count / scored.length) * 100 : 0;
              return (
                <div key={b.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="num text-[0.8125rem] text-ink">{b.label}</span>
                    <span className="num text-[0.8125rem] text-ink-mute">{b.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-overlay">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: scoreColor(b.max) }}
                    />
                  </div>
                </div>
              );
            })}
            {scored.length === 0 && (
              <p className="text-center text-[0.8125rem] text-ink-faint">
                No public validations yet.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top projects" description="Highest validated scores on campus." />
          <CardBody className="space-y-3">
            {data.leaderboard.slice(0, 8).map((row: any, i: number) => (
              <div key={row.project_id} className="flex items-center gap-3">
                <span className="num w-5 text-[0.75rem] text-ink-faint">{i + 1}</span>
                <span
                  className="num w-9 shrink-0 rounded-md py-0.5 text-center text-[0.75rem] font-semibold"
                  style={{ color: scoreColor(row.viability_score), background: "var(--lp-overlay)" }}
                >
                  {row.viability_score}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] font-medium text-ink">{row.title}</p>
                  <p className="text-[0.6875rem] text-ink-faint">
                    {[row.campus, row.domain_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {row.verdict === "investible" && <Badge tone="accent">Investible</Badge>}
              </div>
            ))}
            {data.leaderboard.length === 0 && (
              <p className="py-6 text-center text-[0.8125rem] text-ink-faint">
                Nothing published yet.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent activity" description="What the cohort has been running." />
          <CardBody className="space-y-2.5">
            {data.activity.slice(0, 12).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-[0.8125rem]">
                <Badge tone="neutral">{a.event_type.replace(/_/g, " ")}</Badge>
                <span className="ml-auto text-[0.75rem] text-ink-faint">{relativeTime(a.created_at)}</span>
              </div>
            ))}
            {data.activity.length === 0 && (
              <p className="py-6 text-center text-[0.8125rem] text-ink-faint">No activity yet.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="text-ink-faint">{icon}</div>
      <p className="num mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[0.8125rem] text-ink-mute">{label}</p>
    </Card>
  );
}
