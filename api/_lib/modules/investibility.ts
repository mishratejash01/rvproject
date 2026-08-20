import { generateObject } from "../gemini.js";
import { buildSystemPrompt } from "../prompts.js";
import { investibilitySchema, toGeminiSchema, type InvestibilityOutput } from "../schemas.js";
import { buildFullContext, nextVersion } from "../context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "../supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "../http.js";

/** Module 2 — VC Investibility & Readiness Meter. */
export async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);
    const roastMode = Boolean(body.roastMode ?? project.roast_mode);

    const context = await buildFullContext(db, project, { validation: true });
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(
      db,
      "investibility",
      { roastMode, rubricModule: "investibility", project: context },
    );

    const result = await generateObject<InvestibilityOutput>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Run the investment committee filter now and return the structured verdict.",
      schema: toGeminiSchema(investibilitySchema),
    });

    const parsed = investibilitySchema.safeParse(result);
    if (!parsed.success) {
      throw new ApiError(502, "The AI returned an incomplete verdict. Try again.", parsed.error.issues.slice(0, 3));
    }
    const r = parsed.data;

    const version = await nextVersion(db, "investibility_reports", project.id);
    const { data: saved, error } = await db
      .from("investibility_reports")
      .insert({
        project_id: project.id,
        version,
        verdict: r.verdict,
        verdict_label: r.verdict_label,
        readiness_score: r.readiness_score,
        filter_scores: r.filter_scores,
        verdict_bullets: r.verdict_bullets,
        investor_lens: r.investor_lens,
        full_report: r,
        model_used: model,
        roast_mode: roastMode,
      })
      .select()
      .single();

    if (error) throw new ApiError(500, "Could not save the verdict.", error.message);

    await logActivity(db, user.id, project.id, "verdict", {
      verdict: r.verdict,
      readiness: r.readiness_score,
      version,
    });

    return json({ report: saved });
  } catch (err) {
    return errorResponse(err);
  }
}
