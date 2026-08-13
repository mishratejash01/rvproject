import { generateObject } from "./_lib/gemini.js";
import { buildSystemPrompt } from "./_lib/prompts.js";
import { deckSchema, toGeminiSchema, type DeckOutput } from "./_lib/schemas.js";
import { buildFullContext, latest, nextVersion } from "./_lib/context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http.js";
import { nodeHandler } from "./_lib/node-adapter.js";

export const config = { maxDuration: 90 };

/** Module 4 — Automated AI Pitch Deck Generator (10 slides, YC/Sequoia structure). */
async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);

    const validation = await latest(db, "validations", project.id);
    if (!validation) {
      throw new ApiError(400, "Validate the idea first — the deck is built from your validation data.");
    }

    // Team context makes the Team slide specific rather than generic.
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, branch, year_of_study, campus:campuses(name, short_name, ecosystem_note)")
      .eq("id", user.id)
      .maybeSingle();

    const campus = (profile?.campus as any) ?? null;
    const teamContext = profile
      ? [
          "",
          "── FOUNDER ──",
          `Name: ${profile.full_name ?? "Student founder"}`,
          profile.branch ? `Branch: ${profile.branch}` : "",
          profile.year_of_study ? `Year of study: ${profile.year_of_study}` : "",
          campus ? `Institution: ${campus.name} (${campus.short_name}), Bengaluru` : "",
          campus?.ecosystem_note ? `Campus ecosystem: ${campus.ecosystem_note}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const context = (await buildFullContext(db, project, { validation: true, investibility: true })) + teamContext;
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(db, "deck", {
      roastMode: false, // the deck is always written to persuade, never to roast
      project: context,
    });

    const result = await generateObject<DeckOutput>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Write the complete 10-slide deck now.",
      schema: toGeminiSchema(deckSchema),
    });

    const parsed = deckSchema.safeParse(result);
    if (!parsed.success) {
      throw new ApiError(502, "The AI returned an incomplete deck. Try again.", parsed.error.issues.slice(0, 3));
    }
    if (parsed.data.slides.length < 10) {
      throw new ApiError(502, "The AI returned a partial deck. Try again.");
    }

    const version = await nextVersion(db, "decks", project.id);
    const { data: saved, error } = await db
      .from("decks")
      .insert({
        project_id: project.id,
        version,
        slides: parsed.data.slides,
        narrative_summary: parsed.data.narrative_summary,
        model_used: model,
      })
      .select()
      .single();

    if (error) throw new ApiError(500, "Could not save the deck.", error.message);

    await db.from("projects").update({ status: "deck_ready" }).eq("id", project.id);
    await logActivity(db, user.id, project.id, "deck_generated", { version });

    return json({ deck: saved, ask: parsed.data.ask });
  } catch (err) {
    return errorResponse(err);
  }
}

export default nodeHandler(handler);
