import { generateObject } from "../gemini.js";
import { buildSystemPrompt } from "../prompts.js";
import { grantMatchSchema, toGeminiSchema } from "../schemas.js";
import { buildFullContext } from "../context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "../supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "../http.js";

/**
 * Grant Radar — non-dilutive funding matching. Weighted towards programs a
 * student team can actually enter today (no registered company required).
 */
function scoreGrant(grant: any, domainSlug: string) {
  const domains: string[] = grant.domains ?? [];
  const domainFit = domains.includes(domainSlug) ? 40 : domains.includes("all") ? 26 : 0;
  const studentFit = grant.student_friendly ? 30 : 8;
  const accessFit = grant.needs_registered_company ? 8 : 20;
  const amount = Number(grant.amount_max_inr ?? 0);
  const amountFit = amount >= 5_000_000 ? 10 : amount >= 1_000_000 ? 8 : 6;
  return domainFit + studentFit + accessFit + amountFit;
}

export async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);
    const domainSlug = project.domain?.slug as string;

    const { data: grants, error } = await db.from("grants").select("*").eq("is_active", true);
    if (error) throw new ApiError(500, "Could not load the grants registry.", error.message);
    if (!grants?.length) throw new ApiError(500, "The grants registry is empty.");

    const ranked = grants
      .map((g) => ({ g, score: scoreGrant(g, domainSlug) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const grantBlock = ranked
      .map(
        ({ g }) =>
          `- ${g.name} (${g.agency}, ${g.program_type}): ${g.amount_display}; domains=${(g.domains ?? []).join("/")}; ` +
          `student-friendly=${g.student_friendly}; needs registered company=${g.needs_registered_company}; ` +
          `eligibility: ${g.eligibility_summary}` +
          (g.how_to_apply ? `; route: ${g.how_to_apply}` : ""),
      )
      .join("\n");

    const context = `${await buildFullContext(db, project, { validation: true })}\n\n── GRANT PROGRAMS ──\n${grantBlock}`;
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(db, "grant_match", {
      project: context,
    });

    const result = await generateObject<{
      matches: Array<{
        grant_name: string;
        fit_score: number;
        fit_rationale: string;
        eligibility_note: string;
        next_step: string;
      }>;
    }>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Assess every grant program for this project now.",
      schema: toGeminiSchema(grantMatchSchema),
    });

    const parsed = grantMatchSchema.safeParse(result);
    const byName = new Map(
      (parsed.success ? parsed.data.matches : []).map((m) => [m.grant_name.toLowerCase().trim(), m]),
    );

    const rows = ranked.map(({ g, score }) => {
      const ai = byName.get(g.name.toLowerCase().trim());
      return {
        project_id: project.id,
        grant_id: g.id,
        // The heuristic decides eligibility weight; the model refines within it.
        fit_score: ai ? Math.round((score + ai.fit_score) / 2) : score,
        fit_rationale: ai?.fit_rationale ?? `Matches the ${project.domain?.name ?? "project"} domain and current stage.`,
        eligibility_note: ai?.eligibility_note ?? g.eligibility_summary,
        next_step: ai?.next_step ?? g.how_to_apply ?? null,
      };
    });

    const { error: upErr } = await db
      .from("grant_matches")
      .upsert(rows, { onConflict: "project_id,grant_id" });
    if (upErr) throw new ApiError(500, "Could not save grant matches.", upErr.message);

    const { data: saved } = await db
      .from("grant_matches")
      .select("*, grant:grants(*)")
      .eq("project_id", project.id)
      .order("fit_score", { ascending: false });

    await logActivity(db, user.id, project.id, "grants_matched", { count: rows.length });

    return json({ matches: saved ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}
