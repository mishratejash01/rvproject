import { generateText } from "./_lib/gemini.js";
import { buildSystemPrompt } from "./_lib/prompts.js";
import { renderProject, nextVersion } from "./_lib/context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http.js";
import { nodeHandler } from "./_lib/node-adapter.js";

export const config = { maxDuration: 90 };

/**
 * Founders' agreement template. Student teams split equity equally on day one
 * with no vesting, and it detonates when someone graduates or takes a job.
 * Output is explicitly a template for discussion, never legal advice.
 */
async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);

    const { data: members, error: memErr } = await db
      .from("project_members")
      .select("user_id, role_title, responsibilities, equity_percent, vesting_months, cliff_months, joined_on")
      .eq("project_id", project.id);
    if (memErr) throw new ApiError(500, "Could not load the team.", memErr.message);
    if (!members?.length) {
      throw new ApiError(400, "Add your team members and their equity split first.");
    }

    const { data: names } = await db
      .from("profiles")
      .select("id, full_name, branch, campus:campuses(name)")
      .in("id", members.map((m: any) => m.user_id));
    const nameById = new Map((names ?? []).map((n: any) => [n.id, n]));

    const totalEquity = members.reduce((sum: number, m: any) => sum + Number(m.equity_percent ?? 0), 0);

    const teamBlock = members
      .map((m: any) => {
        const p: any = nameById.get(m.user_id) ?? {};
        return (
          `- ${p.full_name ?? "Unnamed founder"} (${p.branch ?? "branch unknown"}, ${p.campus?.name ?? "RV Institutions"}): ` +
          `${m.role_title}. Equity ${m.equity_percent ?? "unset"}%. ` +
          `Vesting ${m.vesting_months} months with a ${m.cliff_months}-month cliff. Joined ${m.joined_on}.` +
          (m.responsibilities ? ` Responsible for: ${m.responsibilities}.` : "")
        );
      })
      .join("\n");

    const context =
      `${renderProject(project)}\n\n── FOUNDING TEAM ──\n${teamBlock}\n` +
      `Total equity allocated: ${totalEquity}%.` +
      (totalEquity !== 100 ? " NOTE: this does not total 100% — flag this prominently in the agreement." : "");

    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(
      db,
      "founders_agreement",
      { project: context },
    );

    const document = await generateText({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Draft the founders' agreement now.",
    });

    const version = await nextVersion(db, "founders_agreements", project.id);
    const { data: saved, error } = await db
      .from("founders_agreements")
      .insert({
        project_id: project.id,
        version,
        terms: { members, total_equity: totalEquity },
        document,
      })
      .select()
      .single();
    if (error) throw new ApiError(500, "Could not save the agreement.", error.message);

    await logActivity(db, user.id, project.id, "agreement_drafted", { version });

    return json({ agreement: saved });
  } catch (err) {
    return errorResponse(err);
  }
}

export default nodeHandler(handler);
