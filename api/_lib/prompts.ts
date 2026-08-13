import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./http";

/**
 * Prompt templates and scoring rubrics live in the database, not in code.
 * Product behaviour is tuned with SQL, never a redeploy.
 */

export type PromptTemplate = {
  key: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_output_tokens: number | null;
};

export async function loadPrompt(db: SupabaseClient, key: string): Promise<PromptTemplate> {
  const { data, error } = await db
    .from("prompt_templates")
    .select("key, system_prompt, model, temperature, max_output_tokens")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not load AI configuration.", error.message);
  if (!data) throw new ApiError(500, `AI configuration missing for "${key}".`);
  return data as PromptTemplate;
}

/** Renders the rubric rows a module must score against. */
export async function loadRubric(db: SupabaseClient, module: "validation" | "investibility") {
  const { data, error } = await db
    .from("rubric_criteria")
    .select("key, label, description, weight")
    .eq("module", module)
    .order("sort_order");

  if (error) throw new ApiError(500, "Could not load the scoring rubric.", error.message);
  if (!data?.length) throw new ApiError(500, `Scoring rubric missing for "${module}".`);
  return data;
}

export function renderRubric(rows: Array<{ key: string; label: string; description: string; weight: number }>) {
  return rows
    .map((r) => `- ${r.key} (${r.label}, weight ${r.weight}%): ${r.description}`)
    .join("\n");
}

/** Substitutes {{placeholders}}; unknown placeholders are left untouched. */
export function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? vars[key] : match,
  );
}

/**
 * Builds the final system prompt for a module: the tone persona (mentor or
 * roast, from the database) merged into the module template with its rubric.
 */
export async function buildSystemPrompt(
  db: SupabaseClient,
  key: string,
  opts: { roastMode?: boolean; rubricModule?: "validation" | "investibility"; project: string },
) {
  const template = await loadPrompt(db, key);
  const tonePrompt = await loadPrompt(db, opts.roastMode ? "tone_roast" : "tone_mentor");

  const rubric = opts.rubricModule
    ? renderRubric(await loadRubric(db, opts.rubricModule))
    : "";

  const systemPrompt = fillTemplate(template.system_prompt, {
    tone: tonePrompt.system_prompt,
    rubric,
    project: opts.project,
  });

  return {
    systemPrompt,
    model: template.model,
    // Roast mode runs hotter for sharper phrasing.
    temperature: opts.roastMode
      ? Math.min(2, Number(template.temperature) + 0.2)
      : Number(template.temperature),
    maxOutputTokens: template.max_output_tokens,
  };
}
