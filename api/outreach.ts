import { generateObject } from "./_lib/gemini.js";
import { buildSystemPrompt } from "./_lib/prompts.js";
import { outreachSchema, toGeminiSchema, type OutreachOutput } from "./_lib/schemas.js";
import { buildFullContext } from "./_lib/context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http.js";

export const config = { maxDuration: 60 };

/** Module 5 — personalized cold email + LinkedIn DM for one investor. */
export default async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");
    const investorId = Number(body.investorId);
    if (!Number.isFinite(investorId)) throw new ApiError(400, "Missing required field: investorId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);

    const { data: investor, error: invErr } = await db
      .from("investors")
      .select("*")
      .eq("id", investorId)
      .maybeSingle();
    if (invErr || !investor) throw new ApiError(404, "Investor not found.");

    const { data: profile } = await db
      .from("profiles")
      .select("full_name, branch, year_of_study, campus:campuses(name, short_name)")
      .eq("id", user.id)
      .maybeSingle();

    const campus = (profile?.campus as any) ?? null;
    const senderBlock = [
      "",
      "── SENDER ──",
      `Name: ${profile?.full_name ?? "the founder"}`,
      profile?.branch ? `Branch: ${profile.branch}` : "",
      profile?.year_of_study ? `Year: ${profile.year_of_study}` : "",
      campus ? `Institution: ${campus.name} (${campus.short_name}), Bengaluru` : "Institution: RV Institutions, Bengaluru",
      user.email ? `Email: ${user.email}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const investorBlock = [
      "",
      "── TARGET INVESTOR ──",
      `${investor.name} (${investor.firm_type}, ${investor.hq_city ?? "India"})`,
      `Stages: ${(investor.stages ?? []).join(", ")} | Sectors: ${(investor.sectors ?? []).join(", ")}`,
      `Cheque: ${investor.cheque_display ?? "undisclosed"}`,
      `Thesis: ${investor.thesis}`,
      investor.notable_portfolio?.length ? `Portfolio: ${investor.notable_portfolio.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const context =
      (await buildFullContext(db, project, { validation: true })) + investorBlock + senderBlock;

    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(db, "outreach", {
      project: context,
    });

    const result = await generateObject<OutreachOutput>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Write the email and the LinkedIn DM now.",
      schema: toGeminiSchema(outreachSchema),
    });

    const parsed = outreachSchema.safeParse(result);
    if (!parsed.success) throw new ApiError(502, "The AI returned incomplete outreach copy. Try again.");

    const { data: saved, error } = await db
      .from("outreach_drafts")
      .insert([
        {
          project_id: project.id,
          investor_id: investorId,
          channel: "email",
          subject: parsed.data.email.subject,
          body: parsed.data.email.body,
        },
        {
          project_id: project.id,
          investor_id: investorId,
          channel: "linkedin",
          subject: null,
          body: parsed.data.linkedin.body,
        },
      ])
      .select();

    if (error) throw new ApiError(500, "Could not save the outreach drafts.", error.message);

    await logActivity(db, user.id, project.id, "outreach_drafted", { investor: investor.name });

    return json({ drafts: saved });
  } catch (err) {
    return errorResponse(err);
  }
}
