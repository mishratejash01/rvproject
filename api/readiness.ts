import { generateObject } from "./_lib/gemini.js";
import { buildSystemPrompt, fillTemplate } from "./_lib/prompts.js";
import { readinessSchema, toGeminiSchema, type ReadinessOutput } from "./_lib/schemas.js";
import { buildFullContext } from "./_lib/context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http.js";
import { nodeHandler } from "./_lib/node-adapter.js";

export const config = { maxDuration: 60 };

/**
 * TRL / IRL assessment. The level is claimed against published scale
 * definitions and must cite the project's own evidence, because Indian grant
 * applications ask for TRL directly and an inflated claim gets caught.
 */
async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");
    const scale = body.scale === "irl" ? "irl" : "trl";

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);

    const { data: levels, error: lvlErr } = await db
      .from("readiness_levels")
      .select("level, name, description, evidence_required")
      .eq("scale", scale)
      .order("level");
    if (lvlErr || !levels?.length) throw new ApiError(500, "Readiness scale definitions are missing.");

    const { data: evidence } = await db
      .from("evidence")
      .select("title, summary, occurred_on, sample_size, outcome, type:evidence_types(name, is_behavioural)")
      .eq("project_id", project.id)
      .order("occurred_on", { ascending: false });

    const evidenceBlock = evidence?.length
      ? evidence
          .map(
            (e: any) =>
              `- [${e.type?.name ?? "evidence"}${e.type?.is_behavioural ? ", behavioural" : ""}] ${e.title} ` +
              `(${e.occurred_on}, n=${e.sample_size}): ${e.summary}${e.outcome ? ` Outcome: ${e.outcome}` : ""}`,
          )
          .join("\n")
      : "NO EVIDENCE HAS BEEN LOGGED FOR THIS PROJECT.";

    const scaleBlock = levels
      .map((l) => `${scale.toUpperCase()} ${l.level} — ${l.name}: ${l.description} Evidence required: ${l.evidence_required}`)
      .join("\n");

    const context = `${await buildFullContext(db, project, { validation: true })}\n\n── LOGGED EVIDENCE ──\n${evidenceBlock}`;

    const built = await buildSystemPrompt(db, "trl_assess", { project: context });
    // The rubric placeholder carries the scale definitions for this request.
    const systemPrompt = fillTemplate(built.systemPrompt, { rubric: scaleBlock });

    const result = await generateObject<ReadinessOutput>({
      model: built.model,
      temperature: built.temperature,
      maxOutputTokens: built.maxOutputTokens,
      systemInstruction: systemPrompt,
      input: `Assess the ${scale.toUpperCase()} level now and return the structured assessment.`,
      schema: toGeminiSchema(readinessSchema),
    });

    const parsed = readinessSchema.safeParse(result);
    if (!parsed.success) throw new ApiError(502, "The AI returned an incomplete assessment. Try again.");

    const { data: saved, error } = await db
      .from("readiness_assessments")
      .insert({
        project_id: project.id,
        scale,
        level: parsed.data.level,
        justification: parsed.data.justification,
        gaps: parsed.data.gaps,
        next_actions: parsed.data.next_actions,
        model_used: built.model,
      })
      .select()
      .single();
    if (error) throw new ApiError(500, "Could not save the assessment.", error.message);

    await logActivity(db, user.id, project.id, "readiness_assessed", { scale, level: parsed.data.level });

    return json({ assessment: saved, detail: parsed.data });
  } catch (err) {
    return errorResponse(err);
  }
}

export default nodeHandler(handler);
