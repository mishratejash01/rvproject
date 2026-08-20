import { generateObject } from "./_lib/gemini.js";
import { buildSystemPrompt } from "./_lib/prompts.js";
import { interviewScoreSchema, toGeminiSchema, type InterviewScoreOutput } from "./_lib/schemas.js";
import { renderProject } from "./_lib/context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http.js";
import { nodeHandler } from "./_lib/node-adapter.js";

export const config = { maxDuration: 60 };

/**
 * Interview Coach — grades a real customer interview against The Mom Test.
 * The score attaches to the evidence row, so a weak interview visibly counts
 * for less than a strong one.
 */
async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");
    const evidenceId = requireField(body, "evidenceId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);

    const { data: evidence, error: evErr } = await db
      .from("evidence")
      .select("id, title, transcript, summary, project_id")
      .eq("id", evidenceId)
      .maybeSingle();
    if (evErr || !evidence) throw new ApiError(404, "That evidence entry was not found.");
    if (evidence.project_id !== project.id) throw new ApiError(403, "That entry belongs to another project.");

    const transcript = (evidence.transcript ?? "").trim();
    if (transcript.length < 80) {
      throw new ApiError(400, "Paste the interview notes or transcript first — there is too little to grade.");
    }

    const context = `${renderProject(project)}\n\n── INTERVIEW: ${evidence.title} ──\n${transcript}`;
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(
      db,
      "interview_score",
      { project: context },
    );

    const result = await generateObject<InterviewScoreOutput>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Grade this interview now.",
      schema: toGeminiSchema(interviewScoreSchema),
    });

    const parsed = interviewScoreSchema.safeParse(result);
    if (!parsed.success) throw new ApiError(502, "The AI returned an incomplete grading. Try again.");

    const { data: saved, error } = await db
      .from("evidence")
      .update({ mom_test: parsed.data })
      .eq("id", evidenceId)
      .select("*, type:evidence_types(*)")
      .single();
    if (error) throw new ApiError(500, "Could not save the grading.", error.message);

    await logActivity(db, user.id, project.id, "interview_graded", { score: parsed.data.score });

    return json({ evidence: saved });
  } catch (err) {
    return errorResponse(err);
  }
}

export default nodeHandler(handler);
