import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Renders project state into the plain-text context block every prompt receives.
 * Downstream modules see upstream results, so the deck quotes the same market
 * numbers the validation produced instead of inventing new ones.
 */

type ProjectRow = Record<string, any>;

export function renderProject(project: ProjectRow): string {
  const domain = project.domain?.name ?? project.domain_slug ?? "Unspecified";
  return [
    `TITLE: ${project.title}`,
    `DOMAIN: ${domain}`,
    `PROBLEM STATEMENT: ${project.problem_statement}`,
    `TARGET USER PERSONA: ${project.target_persona}`,
    `TECHNICAL APPROACH: ${project.technical_approach}`,
  ].join("\n");
}

export function renderValidation(v: ProjectRow | null): string {
  if (!v) return "";
  const ms = v.market_sizing ?? {};
  const def = v.defensibility ?? {};
  const weaknesses = Array.isArray(v.full_report?.weaknesses)
    ? v.full_report.weaknesses.map((w: any) => `  - ${w.title}: ${w.detail}`).join("\n")
    : "";
  const strengths = Array.isArray(v.full_report?.strengths)
    ? v.full_report.strengths.map((s: any) => `  - ${s.title}: ${s.detail}`).join("\n")
    : "";

  return [
    "",
    "── LATEST VALIDATION ──",
    `Viability score: ${v.viability_score}/100 (${v.pain_classification})`,
    `Headline: ${v.headline ?? ""}`,
    `Summary: ${v.summary ?? ""}`,
    ms.tam ? `TAM: ${ms.tam.display ?? ms.tam.value_usd} — ${ms.tam.method ?? ""}` : "",
    ms.sam ? `SAM: ${ms.sam.display ?? ms.sam.value_usd} — ${ms.sam.method ?? ""}` : "",
    ms.som ? `SOM: ${ms.som.display ?? ms.som.value_usd} — ${ms.som.method ?? ""}` : "",
    def.moat_type ? `Moat: ${def.moat_type} (score ${def.moat_score}), wrapper=${def.is_wrapper}` : "",
    def.analysis ? `Defensibility: ${def.analysis}` : "",
    weaknesses ? `Weaknesses:\n${weaknesses}` : "",
    strengths ? `Strengths:\n${strengths}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderInvestibility(r: ProjectRow | null): string {
  if (!r) return "";
  const bullets = Array.isArray(r.verdict_bullets)
    ? r.verdict_bullets.map((b: any) => `  - ${b.title}: ${b.detail}`).join("\n")
    : "";
  return [
    "",
    "── INVESTIBILITY VERDICT ──",
    `${r.verdict_label} (readiness ${r.readiness_score}/100)`,
    bullets,
    r.investor_lens ? `Partner view: ${r.investor_lens}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Latest row of a versioned table for a project. */
export async function latest(db: SupabaseClient, table: string, projectId: string) {
  const { data } = await db
    .from(table)
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function nextVersion(db: SupabaseClient, table: string, projectId: string) {
  const row = await latest(db, table, projectId);
  return ((row?.version as number) ?? 0) + 1;
}

/** Full context: project plus whichever upstream results already exist. */
export async function buildFullContext(
  db: SupabaseClient,
  project: ProjectRow,
  opts: { validation?: boolean; investibility?: boolean } = { validation: true },
) {
  let out = renderProject(project);
  if (opts.validation !== false) {
    out += renderValidation(await latest(db, "validations", project.id));
  }
  if (opts.investibility) {
    out += renderInvestibility(await latest(db, "investibility_reports", project.id));
  }
  return out;
}
