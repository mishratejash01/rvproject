import { generateObject } from "../gemini.js";
import { buildSystemPrompt } from "../prompts.js";
import { cofounderRationaleSchema, toGeminiSchema } from "../schemas.js";
import { renderProject } from "../context.js";
import { serviceClient, requireUser, requireOwnedProject } from "../supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "../http.js";

const SHORTLIST = 10;

/**
 * Co-founder matching rewards COMPLEMENTARITY, not similarity: teams fail from
 * redundancy and unspoken expectations far more often than from lack of talent.
 * Ranking is deterministic; the model only writes the assessment.
 */
function scoreCandidate(
  candidate: any,
  needed: Set<string>,
  teamSkills: Set<string>,
  domainSlug: string,
) {
  const has: string[] = candidate.skills ?? [];

  // Skills the team explicitly wants and this person has.
  const fills = has.filter((s) => needed.has(s));
  // Skills nobody on the team has — valuable even if not explicitly requested.
  const newToTeam = has.filter((s) => !teamSkills.has(s));
  // Pure overlap adds little; heavy overlap is a warning sign.
  const overlap = has.filter((s) => teamSkills.has(s));

  const gapFit = Math.min(45, fills.length * 18);
  const breadth = Math.min(20, newToTeam.length * 5);
  const domainFit = (candidate.interests ?? []).includes(domainSlug) ? 15 : 0;
  const commitmentFit =
    candidate.commitment === "full_time_now"
      ? 15
      : candidate.commitment === "full_time_after_graduation"
        ? 12
        : candidate.commitment === "part_time"
          ? 8
          : 4;
  const redundancy = Math.min(10, overlap.length * 3);

  return {
    total: Math.max(0, Math.min(100, gapFit + breadth + domainFit + commitmentFit + 10 - redundancy)),
    breakdown: { gap_fit: gapFit, new_skills: breadth, domain_fit: domainFit, commitment: commitmentFit, redundancy_penalty: redundancy },
    fills,
    newToTeam,
  };
}

export async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);
    const domainSlug = (project.domain?.slug as string) ?? "";

    // Everything the current team already brings.
    const { data: members } = await db
      .from("project_members")
      .select("user_id, role_title")
      .eq("project_id", project.id);
    const memberIds = new Set<string>([user.id, ...(members ?? []).map((m: any) => m.user_id)]);

    const { data: teamProfiles } = await db
      .from("cofounder_profiles")
      .select("user_id, skills, looking_for")
      .in("user_id", [...memberIds]);

    const teamSkills = new Set<string>((teamProfiles ?? []).flatMap((p: any) => p.skills ?? []));
    const needed = new Set<string>((teamProfiles ?? []).flatMap((p: any) => p.looking_for ?? []));

    const { data: candidates, error } = await db
      .from("cofounder_profiles")
      .select("*")
      .eq("is_seeking", true);
    if (error) throw new ApiError(500, "Could not load co-founder profiles.", error.message);

    const pool = (candidates ?? []).filter((c: any) => !memberIds.has(c.user_id));
    if (!pool.length) return json({ matches: [], still_missing: null });

    const ranked = pool
      .map((c: any) => ({ candidate: c, ...scoreCandidate(c, needed, teamSkills, domainSlug) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, SHORTLIST);

    // Names come from profiles, which the service role can read.
    const { data: names } = await db
      .from("profiles")
      .select("id, full_name, branch, year_of_study, campus:campuses(short_name)")
      .in("id", ranked.map((r) => r.candidate.user_id));
    const nameById = new Map((names ?? []).map((n: any) => [n.id, n]));

    const candidateBlock = ranked
      .map(({ candidate, fills, newToTeam }) => {
        const p: any = nameById.get(candidate.user_id) ?? {};
        return (
          `- ${p.full_name ?? "Unnamed student"} (${p.branch ?? "branch unknown"}, ${p.campus?.short_name ?? "RV"}): ` +
          `${candidate.headline}. Skills: ${(candidate.skills ?? []).join(", ") || "none listed"}. ` +
          `Commitment: ${candidate.commitment}. Fills team gaps: ${fills.join(", ") || "none"}. ` +
          `New to team: ${newToTeam.join(", ") || "none"}.`
        );
      })
      .join("\n");

    const context =
      `${renderProject(project)}\n\n── TEAM SKILLS TODAY ──\n${[...teamSkills].join(", ") || "none recorded"}\n` +
      `── EXPLICITLY LOOKING FOR ──\n${[...needed].join(", ") || "not specified"}\n\n` +
      `── CANDIDATES ──\n${candidateBlock}`;

    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(
      db,
      "cofounder_rationale",
      { project: context },
    );

    const result = await generateObject<{
      assessments: Array<{ candidate_name: string; gap_closed: string; friction_risk: string }>;
      still_missing: string;
    }>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Assess every candidate now.",
      schema: toGeminiSchema(cofounderRationaleSchema),
    });

    const parsed = cofounderRationaleSchema.safeParse(result);
    const byName = new Map(
      (parsed.success ? parsed.data.assessments : []).map((a) => [a.candidate_name.toLowerCase().trim(), a]),
    );

    const matches = ranked.map(({ candidate, total, breakdown, fills }) => {
      const p: any = nameById.get(candidate.user_id) ?? {};
      const ai = byName.get((p.full_name ?? "").toLowerCase().trim());
      return {
        user_id: candidate.user_id,
        full_name: p.full_name ?? "Unnamed student",
        branch: p.branch ?? null,
        campus: p.campus?.short_name ?? null,
        headline: candidate.headline,
        skills: candidate.skills ?? [],
        commitment: candidate.commitment,
        portfolio_url: candidate.portfolio_url ?? null,
        fit_score: total,
        fit_breakdown: breakdown,
        fills_gaps: fills,
        gap_closed: ai?.gap_closed ?? null,
        friction_risk: ai?.friction_risk ?? null,
      };
    });

    return json({ matches, still_missing: parsed.success ? parsed.data.still_missing : null });
  } catch (err) {
    return errorResponse(err);
  }
}
