import { generateObject } from "./_lib/gemini";
import { buildSystemPrompt } from "./_lib/prompts";
import { matchRationaleSchema, toGeminiSchema } from "./_lib/schemas";
import { buildFullContext } from "./_lib/context";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "./_lib/supabase";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "./_lib/http";

export const config = { maxDuration: 60 };

const SHORTLIST = 12;

/**
 * Deterministic fit scoring, so ranking is explainable and identical on every
 * run. The model only writes the rationale — it never invents the ranking.
 */
function scoreInvestor(inv: any, domainSlug: string) {
  const sectors: string[] = inv.sectors ?? [];
  const stages: string[] = inv.stages ?? [];

  const sector = sectors.includes(domainSlug) ? 40 : sectors.includes("sector_agnostic") ? 28 : 0;
  const stage = stages.includes("pre_seed") ? 25 : stages.includes("seed") ? 18 : 6;
  const student = inv.works_with_student_founders ? 20 : 4;

  // Student teams raise small first cheques — funds that write them rank higher.
  const min = Number(inv.cheque_min_usd ?? 0);
  const cheque = min > 0 && min <= 250_000 ? 15 : min <= 1_000_000 ? 10 : 5;

  return {
    total: sector + stage + student + cheque,
    breakdown: { sector, stage, student_fit: student, cheque_fit: cheque },
  };
}

/** Module 5 — Investor matching with deterministic ranking + AI rationale. */
export default async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);
    const domainSlug = project.domain?.slug as string;

    const { data: investors, error: invErr } = await db
      .from("investors")
      .select("*")
      .eq("is_active", true);
    if (invErr) throw new ApiError(500, "Could not load the investor database.", invErr.message);
    if (!investors?.length) throw new ApiError(500, "The investor database is empty.");

    const ranked = investors
      .map((inv) => ({ inv, ...scoreInvestor(inv, domainSlug) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, SHORTLIST);

    // One AI call covers the whole shortlist — cheaper and more consistent than
    // one call per investor.
    const investorBlock = ranked
      .map(
        ({ inv }) =>
          `- ${inv.name} (${inv.firm_type}, ${inv.hq_city ?? "India"}): stages=${(inv.stages ?? []).join("/")}; ` +
          `sectors=${(inv.sectors ?? []).join("/")}; cheque=${inv.cheque_display ?? "n/a"}; ` +
          `student-friendly=${inv.works_with_student_founders}; thesis: ${inv.thesis}` +
          (inv.notable_portfolio?.length ? `; portfolio: ${inv.notable_portfolio.slice(0, 4).join(", ")}` : ""),
      )
      .join("\n");

    const context = `${await buildFullContext(db, project, { validation: true })}\n\n── SHORTLISTED INVESTORS ──\n${investorBlock}`;
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(
      db,
      "match_rationale",
      { project: context },
    );

    const result = await generateObject<{ rationales: Array<{ investor_name: string; rationale: string }> }>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Write the fit rationale for every shortlisted investor.",
      schema: toGeminiSchema(matchRationaleSchema),
    });

    const byName = new Map(
      (matchRationaleSchema.safeParse(result).success ? result.rationales : []).map((r) => [
        r.investor_name.toLowerCase().trim(),
        r.rationale,
      ]),
    );

    const rows = ranked.map(({ inv, total, breakdown }) => ({
      project_id: project.id,
      investor_id: inv.id,
      fit_score: Math.min(100, total),
      fit_breakdown: breakdown,
      rationale: byName.get(inv.name.toLowerCase().trim()) ?? null,
    }));

    const { error: upErr } = await db
      .from("investor_matches")
      .upsert(rows, { onConflict: "project_id,investor_id" });
    if (upErr) throw new ApiError(500, "Could not save investor matches.", upErr.message);

    const { data: saved } = await db
      .from("investor_matches")
      .select("*, investor:investors(*)")
      .eq("project_id", project.id)
      .order("fit_score", { ascending: false });

    await db.from("projects").update({ status: "outreach" }).eq("id", project.id);
    await logActivity(db, user.id, project.id, "matched", { count: rows.length });

    return json({ matches: saved ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}
