import { generateObject } from "../gemini.js";
import { buildSystemPrompt } from "../prompts.js";
import { benchmarkCompareSchema, toGeminiSchema } from "../schemas.js";
import { buildFullContext } from "../context.js";
import { serviceClient, requireUser, requireOwnedProject, logActivity } from "../supabase.js";
import { ApiError, errorResponse, json, readJson, requirePost, requireField } from "../http.js";

/**
 * Sector slugs in the benchmark set are finer-grained than the six project
 * domains, so each domain maps to its adjacent real-world sectors.
 */
const ADJACENT: Record<string, string[]> = {
  ai_ml: ["ai_ml", "saas", "healthtech"],
  deeptech: ["deeptech", "spacetech", "hardware", "climate"],
  saas: ["saas", "ai_ml", "fintech"],
  fintech: ["fintech", "saas", "consumer"],
  hardware: ["hardware", "deeptech", "climate", "logistics"],
  consumer: ["consumer", "edtech", "logistics", "fintech"],
};

/** Live Indian startup benchmark comparison. */
export async function handler(req: Request): Promise<Response> {
  try {
    requirePost(req);
    const body = await readJson<Record<string, unknown>>(req);
    const projectId = requireField(body, "projectId");

    const user = await requireUser(req);
    const db = serviceClient();
    const project = await requireOwnedProject(db, projectId, user.id);
    const domainSlug = (project.domain?.slug as string) ?? "ai_ml";

    const sectors = ADJACENT[domainSlug] ?? [domainSlug];
    const { data: pool, error } = await db
      .from("benchmarks")
      .select("*")
      .in("sector_slug", sectors);
    if (error) throw new ApiError(500, "Could not load benchmarks.", error.message);
    if (!pool?.length) throw new ApiError(404, "No benchmarks available for this domain yet.");

    // Exact-sector companies first, then adjacent ones, capped at five.
    const selected = [...pool]
      .sort((a, b) => {
        const exact = Number(b.sector_slug === domainSlug) - Number(a.sector_slug === domainSlug);
        if (exact !== 0) return exact;
        return Number(b.valuation_usd ?? 0) - Number(a.valuation_usd ?? 0);
      })
      .slice(0, 5);

    const benchmarkBlock = selected
      .map(
        (b) =>
          `- ${b.startup_name} (${b.sector_slug}, ${b.hq_city ?? "India"}, founded ${b.founded_year ?? "n/a"}): ` +
          `${b.valuation_display ?? "valuation undisclosed"}; total raised ${b.total_funding_usd ? `$${Number(b.total_funding_usd).toLocaleString()}` : "n/a"}. ` +
          `Key milestone: ${b.key_metric ?? "n/a"}. Origin: ${b.founding_story ?? "n/a"}`,
      )
      .join("\n");

    const context = `${await buildFullContext(db, project, { validation: true })}\n\n── BENCHMARK COMPANIES ──\n${benchmarkBlock}`;
    const { systemPrompt, model, temperature, maxOutputTokens } = await buildSystemPrompt(
      db,
      "benchmark_compare",
      { project: context },
    );

    const result = await generateObject<{
      comparisons: Array<{ startup_name: string; parallel_analysis: string; lesson: string }>;
    }>({
      model,
      temperature,
      maxOutputTokens,
      systemInstruction: systemPrompt,
      input: "Draw the benchmark parallels for this project now.",
      schema: toGeminiSchema(benchmarkCompareSchema),
    });

    const parsed = benchmarkCompareSchema.safeParse(result);
    if (!parsed.success) throw new ApiError(502, "The AI returned incomplete comparisons. Try again.");

    const byName = new Map(parsed.data.comparisons.map((c) => [c.startup_name.toLowerCase().trim(), c]));
    const rows = selected
      .map((b) => {
        const ai = byName.get(b.startup_name.toLowerCase().trim());
        if (!ai) return null;
        return {
          project_id: project.id,
          benchmark_id: b.id,
          parallel_analysis: ai.parallel_analysis,
          lesson: ai.lesson,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    if (rows.length) {
      const { error: upErr } = await db
        .from("benchmark_links")
        .upsert(rows, { onConflict: "project_id,benchmark_id" });
      if (upErr) throw new ApiError(500, "Could not save benchmark comparisons.", upErr.message);
    }

    const { data: saved } = await db
      .from("benchmark_links")
      .select("*, benchmark:benchmarks(*)")
      .eq("project_id", project.id);

    await logActivity(db, user.id, project.id, "benchmarked", { count: rows.length });

    return json({ comparisons: saved ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}
