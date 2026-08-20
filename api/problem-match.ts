import { generateObject } from "./_lib/gemini.js";
import { buildSystemPrompt } from "./_lib/prompts.js";
import { problemFitSchema, toGeminiSchema } from "./_lib/schemas.js";
import { buildFullContext } from "./_lib/context.js";
import { serviceClient, requireUser, requireOwnedProject } from "./_lib/supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http.js";
import { nodeHandler } from "./_lib/node-adapter.js";

export const config = { maxDuration: 60 };

/** Matches a team to open industry problems posted by named organisations. */
async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);

    const { data: problems, error } = await db
      .from("industry_problems")
      .select("*, partner:industry_partners(name, sector, organisation_type, city)")
      .eq("status", "open")
      .limit(12);
    if (error) throw new ApiError(500, "Could not load the problem bank.", error.message);
    if (!problems?.length) return json({ fits: [] });

    const problemBlock = problems
      .map(
        (p: any) =>
          `- "${p.title}" from ${p.partner?.name ?? "a partner"} (${p.partner?.organisation_type ?? "org"}, ${p.partner?.sector ?? "sector"}): ` +
          `${p.problem_statement} Desired outcome: ${p.desired_outcome}. ` +
          `Stakeholder available: ${p.stakeholder_available}; data available: ${p.data_available}; pilot possible: ${p.pilot_possible}.`,
      )
      .join("\n");

    const context = `${await buildFullContext(db, project, { validation: true })}\n\n── OPEN INDUSTRY PROBLEMS ──\n${problemBlock}`;
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(db, "problem_fit", {
      project: context,
    });

    const result = await generateObject<{
      fits: Array<{
        problem_title: string;
        rationale: string;
        capability_gap: string;
        is_services_engagement: boolean;
        fit_score: number;
      }>;
    }>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Assess fit for every open problem now.",
      schema: toGeminiSchema(problemFitSchema),
    });

    const parsed = problemFitSchema.safeParse(result);
    if (!parsed.success) throw new ApiError(502, "The AI returned an incomplete assessment. Try again.");

    const byTitle = new Map(parsed.data.fits.map((f) => [f.problem_title.toLowerCase().trim(), f]));
    const fits = problems
      .map((p: any) => {
        const ai = byTitle.get(p.title.toLowerCase().trim());
        return ai ? { problem: p, ...ai } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.fit_score - a.fit_score);

    return json({ fits });
  } catch (err) {
    return errorResponse(err);
  }
}

export default nodeHandler(handler);
