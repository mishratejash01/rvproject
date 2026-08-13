import { generateObject } from "./_lib/gemini.js";
import { buildSystemPrompt } from "./_lib/prompts.js";
import { pivotsSchema, toGeminiSchema, type PivotsOutput } from "./_lib/schemas.js";
import { buildFullContext, latest } from "./_lib/context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http.js";

export const config = { maxDuration: 60 };

/** Module 3 — Intelligent Pivot Matrix. */
export default async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);
    const roastMode = Boolean(body.roastMode ?? project.roast_mode);

    const validation = await latest(db, "validations", project.id);
    if (!validation) {
      throw new ApiError(400, "Validate the idea first — pivots are generated from the weaknesses it finds.");
    }

    const context = await buildFullContext(db, project, { validation: true, investibility: true });
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(db, "pivots", {
      roastMode,
      project: context,
    });

    const result = await generateObject<PivotsOutput>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Generate the three strategic pivots now.",
      schema: toGeminiSchema(pivotsSchema),
    });

    const parsed = pivotsSchema.safeParse(result);
    if (!parsed.success) {
      throw new ApiError(502, "The AI returned incomplete pivots. Try again.", parsed.error.issues.slice(0, 3));
    }

    // Replace any previous suggestions so the matrix always reflects the latest validation.
    await db.from("pivots").delete().eq("project_id", project.id).eq("adopted", false);

    const rows = parsed.data.pivots.map((p) => ({
      project_id: project.id,
      validation_id: validation.id,
      title: p.title,
      pivot_thesis: p.pivot_thesis,
      what_changes: p.what_changes,
      target_market: p.target_market,
      business_model_shift: p.business_model_shift,
      difficulty: p.difficulty,
      expected_score_delta: p.expected_score_delta,
      rationale: p.rationale,
    }));

    const { data: saved, error } = await db.from("pivots").insert(rows).select();
    if (error) throw new ApiError(500, "Could not save the pivots.", error.message);

    await logActivity(db, user.id, project.id, "pivoted", { count: rows.length });

    return json({ pivots: saved });
  } catch (err) {
    return errorResponse(err);
  }
}
