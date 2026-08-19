import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Rocket, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreGauge } from "@/components/ScoreGauge";
import { formatUsd } from "@/lib/utils";
import type { Project, Validation, InvestibilityReport, Deck } from "@/lib/types";

/**
 * Read-only public pitch page. Anonymous visitors can reach this — RLS exposes
 * only projects whose founder switched sharing on.
 */
export default function PublicPitch() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["public-pitch", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data: project, error } = await supabase
        .from("projects")
        .select("*, domain:domains(*)")
        .eq("share_slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!project) return null;

      const [validation, report, deck] = await Promise.all([
        supabase.from("validations").select("*").eq("project_id", project.id)
          .order("version", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("investibility_reports").select("*").eq("project_id", project.id)
          .order("version", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("decks").select("*").eq("project_id", project.id)
          .order("version", { ascending: false }).limit(1).maybeSingle(),
      ]);

      return {
        project: project as Project,
        validation: validation.data as Validation | null,
        report: report.data as InvestibilityReport | null,
        deck: deck.data as Deck | null,
      };
    },
  });

  // Count the visit once per mount, via a definer function open to anon.
  useEffect(() => {
    if (data?.project && slug) {
      supabase.rpc("increment_share_view", { slug }).then(() => {});
    }
  }, [data?.project, slug]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-5">
          <Link to="/" className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            <span className="font-display text-[0.9375rem] font-semibold tracking-tight">LaunchPad RV</span>
          </Link>
          <Link to="/auth" className="ml-auto">
            <Button size="sm" variant="outline">Validate your own idea</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-48" />
          </div>
        ) : !data?.project ? (
          <Card>
            <EmptyState
              title="This pitch is not public"
              description="The link may be wrong, or the founder has turned sharing off."
            />
          </Card>
        ) : (
          <article className="space-y-8">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{data.project.domain?.name}</Badge>
                {data.report?.verdict === "investible" && <Badge tone="accent">Seed investible</Badge>}
                <span className="flex items-center gap-1 text-[0.75rem] text-ink-faint">
                  <Eye className="h-3 w-3" />
                  {data.project.share_views}
                </span>
              </div>
              <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight">
                {data.project.title}
              </h1>
              {data.validation?.headline && (
                <p className="mt-3 text-base leading-relaxed text-ink-mute">{data.validation.headline}</p>
              )}
            </header>

            {data.validation && (
              <Card>
                <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:gap-10">
                  <ScoreGauge score={data.validation.viability_score} label="Viability" size={140} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.875rem] leading-relaxed text-ink-mute">{data.validation.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-6">
                      {(["tam", "sam", "som"] as const).map((k) => {
                        const leg = data.validation!.market_sizing?.[k];
                        if (!leg) return null;
                        return (
                          <div key={k}>
                            <p className="text-[0.6875rem] tracking-wide text-ink-faint uppercase">{k}</p>
                            <p className="num mt-0.5 text-[0.9375rem] font-semibold text-ink">
                              {leg.display || formatUsd(leg.value_usd)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <section>
              <h2 className="font-display text-lg font-semibold tracking-tight">The problem</h2>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-mute">
                {data.project.problem_statement}
              </p>
              <h2 className="mt-6 font-display text-lg font-semibold tracking-tight">How it works</h2>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-mute">
                {data.project.technical_approach}
              </p>
            </section>

            {data.deck?.slides && data.deck.slides.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold tracking-tight">The pitch</h2>
                <div className="mt-4 space-y-4">
                  {data.deck.slides.map((slide, i) => (
                    <Card key={slide.key} className="p-5">
                      <p className="text-[0.6875rem] tracking-wide text-ink-faint uppercase">
                        {String(i + 1).padStart(2, "0")} · {slide.key.replace(/_/g, " ")}
                      </p>
                      <h3 className="mt-2 font-display text-[0.9375rem] font-semibold tracking-tight text-ink">
                        {slide.title}
                      </h3>
                      <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink">{slide.headline}</p>
                      <ul className="mt-3 space-y-1.5">
                        {slide.bullets.map((b, j) => (
                          <li key={j} className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-ink-mute">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <footer className="border-t border-line pt-6">
              <p className="text-[0.8125rem] text-ink-faint">
                Validated on LaunchPad RV Institutions, Bengaluru.
              </p>
            </footer>
          </article>
        )}
      </main>
    </div>
  );
}
