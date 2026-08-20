import { generateObject } from "../gemini.js";
import { buildSystemPrompt } from "../prompts.js";
import { validationSchema, toGeminiSchema, type ValidationOutput } from "../schemas.js";
import { renderProject, nextVersion } from "../context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "../supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "../http.js";

/** Module 1 — Idea Validation & "Worth Solving" engine. */
export async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);
    const roastMode = Boolean(body.roastMode ?? project.roast_mode);

    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(
      db,
      "validation",
      { roastMode, rubricModule: "validation", project: renderProject(project) },
    );

    const result = await generateObject<ValidationOutput>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Run the full validation now and return the structured report.",
      schema: toGeminiSchema(validationSchema),
    });

    const parsed = validationSchema.safeParse(result);
    if (!parsed.success) {
      throw new ApiError(502, "The AI returned an incomplete validation. Try again.", parsed.error.issues.slice(0, 3));
    }
    const v = parsed.data;

    /*
     * Evidence cap. The model's judgement is kept as `ai_score`, but the
     * headline number is bounded by what the team can actually prove:
     *   cap = 40 + 0.6 x evidence_score
     * With nothing logged the ceiling is 40, which is the point — a score
     * should describe how much is known, not how much the model liked the
     * writing. Computed in the database so it stays auditable.
     */
    const { data: evScore } = await db.rpc("project_evidence_score", { p_project_id: project.id });
    const evidenceScore = Number(evScore ?? 0);
    const evidenceCap = Math.min(100, 40 + 0.6 * evidenceScore);
    const { count: evidenceCount } = await db
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id);

    const cappedScore = Math.min(v.viability_score, Math.round(evidenceCap));

    const version = await nextVersion(db, "validations", project.id);
    const { data: saved, error } = await db
      .from("validations")
      .insert({
        project_id: project.id,
        version,
        viability_score: cappedScore,
        ai_score: v.viability_score,
        evidence_score: evidenceScore,
        evidence_cap: Math.round(evidenceCap * 100) / 100,
        evidence_count: evidenceCount ?? 0,
        pain_classification: v.pain_classification,
        sub_scores: v.sub_scores,
        tam_usd: v.market_sizing.tam.value_usd,
        sam_usd: v.market_sizing.sam.value_usd,
        som_usd: v.market_sizing.som.value_usd,
        market_sizing: v.market_sizing,
        defensibility: v.defensibility,
        headline: v.headline,
        summary: v.summary,
        full_report: v,
        model_used: model,
        roast_mode: roastMode,
      })
      .select()
      .single();

    if (error) throw new ApiError(500, "Could not save the validation.", error.message);

    if (project.status === "draft") {
      await db.from("projects").update({ status: "validated" }).eq("id", project.id);
    }
    await logActivity(db, user.id, project.id, "validated", {
      score: cappedScore,
      ai_score: v.viability_score,
      evidence_score: evidenceScore,
      classification: v.pain_classification,
      version,
    });

    return json({ validation: saved });
  } catch (err) {
    return errorResponse(err);
  }
}
