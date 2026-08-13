import { generateObject } from "./_lib/gemini";
import { buildSystemPrompt } from "./_lib/prompts";
import { validationSchema, toGeminiSchema, type ValidationOutput } from "./_lib/schemas";
import { renderProject, nextVersion } from "./_lib/context";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http";

export const config = { maxDuration: 60 };

/** Module 1 — Idea Validation & "Worth Solving" engine. */
export default async function handler(req: Request): Promise<Response> {
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

    const version = await nextVersion(db, "validations", project.id);
    const { data: saved, error } = await db
      .from("validations")
      .insert({
        project_id: project.id,
        version,
        viability_score: v.viability_score,
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
      score: v.viability_score,
      classification: v.pain_classification,
      version,
    });

    return json({ validation: saved });
  } catch (err) {
    return errorResponse(err);
  }
}
