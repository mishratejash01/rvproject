import { generateObject } from "./_lib/gemini.js";
import { buildSystemPrompt } from "./_lib/prompts.js";
import { priorArtSchema, toGeminiSchema, type PriorArtOutput } from "./_lib/schemas.js";
import { renderProject } from "./_lib/context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http.js";
import { nodeHandler } from "./_lib/node-adapter.js";

export const config = { maxDuration: 60 };

/**
 * Prior-art gate. Produces a search strategy the student runs themselves, then
 * assesses novelty against whatever they found. It never claims to have
 * searched the patent databases — the verdict stays "inconclusive" until real
 * findings are supplied.
 */
async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");
    const findings = Array.isArray(body.findings) ? body.findings : [];

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);

    const findingsBlock = findings.length
      ? findings
          .map(
            (f: any, i: number) =>
              `${i + 1}. ${f.title ?? "untitled"} (${f.number ?? "no number"}, ${f.assignee ?? "unknown assignee"}, ${f.year ?? "?"}) — ${f.note ?? ""}`,
          )
          .join("\n")
      : "NO PRIOR-ART SEARCH HAS BEEN RUN YET. Treat novelty as inconclusive and focus on the search strategy.";

    const context = `${renderProject(project)}\n\n── PRIOR ART FOUND SO FAR ──\n${findingsBlock}`;
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(db, "prior_art", {
      project: context,
    });

    const result = await generateObject<PriorArtOutput>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Produce the search strategy and novelty assessment now.",
      schema: toGeminiSchema(priorArtSchema),
    });

    const parsed = priorArtSchema.safeParse(result);
    if (!parsed.success) throw new ApiError(502, "The AI returned an incomplete assessment. Try again.");

    const { data: saved, error } = await db
      .from("prior_art_searches")
      .insert({
        project_id: project.id,
        search_strategy: parsed.data.search_strategy,
        findings,
        novelty_verdict: parsed.data.novelty_verdict,
        novelty_analysis: parsed.data.novelty_analysis,
        differentiators: parsed.data.differentiators,
        recommended_action: parsed.data.recommended_action,
        filing_recommendation: parsed.data.filing_recommendation,
        model_used: model,
      })
      .select()
      .single();
    if (error) throw new ApiError(500, "Could not save the search.", error.message);

    await logActivity(db, user.id, project.id, "prior_art_searched", {
      verdict: parsed.data.novelty_verdict,
    });

    return json({ search: saved, detail: parsed.data });
  } catch (err) {
    return errorResponse(err);
  }
}

export default nodeHandler(handler);
