import { z } from "zod";

/**
 * Structured-output contracts. Each schema is defined once in Zod, converted to
 * JSON Schema to constrain the model, and reused to validate what comes back.
 *
 * Field order matters: reasoning fields are declared before their scores so the
 * model argues before it grades, which measurably improves score quality.
 */

/** Strips JSON Schema keywords the Gemini structured-output validator rejects. */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const raw = z.toJSONSchema(schema, { target: "draft-7", io: "output" }) as Record<string, unknown>;
  const strip = (node: any): any => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        if (key === "$schema" || key === "additionalProperties" || key === "exclusiveMinimum" || key === "exclusiveMaximum") {
          continue;
        }
        out[key] = strip(value);
      }
      return out;
    }
    return node;
  };
  return strip(raw);
}

const score = z.number().int().min(0).max(100);

/* ── Module 1: Idea Validation ─────────────────────────────────────── */

const subScore = z.object({
  key: z.string(),
  label: z.string(),
  reasoning: z.string(),
  score,
});

const marketLeg = z.object({
  method: z.string().describe("The bottom-up arithmetic used"),
  value_usd: z.number(),
  display: z.string().describe("Human-readable, e.g. '$2.4B'"),
});

const point = z.object({ title: z.string(), detail: z.string() });

export const validationSchema = z.object({
  headline: z.string().describe("One-line verdict, max 15 words"),
  summary: z.string(),
  sub_scores: z.array(subScore),
  viability_score: score,
  pain_classification: z.enum(["vitamin", "painkiller"]),
  pain_reasoning: z.string(),
  market_sizing: z.object({ tam: marketLeg, sam: marketLeg, som: marketLeg }),
  defensibility: z.object({
    analysis: z.string(),
    is_wrapper: z.boolean(),
    moat_type: z.enum([
      "proprietary_data",
      "deep_tech",
      "network_effects",
      "workflow_lock_in",
      "regulatory",
      "brand",
      "cost_structure",
      "none",
    ]),
    moat_score: score,
    replication_risks: z.array(z.string()),
  }),
  weaknesses: z.array(point).describe("The three sharpest weaknesses"),
  strengths: z.array(point),
});
export type ValidationOutput = z.infer<typeof validationSchema>;

/* ── Module 2: VC Investibility ────────────────────────────────────── */

export const investibilitySchema = z.object({
  filter_scores: z.array(subScore),
  readiness_score: score,
  verdict: z.enum(["investible", "academic"]),
  verdict_label: z.string(),
  verdict_bullets: z.array(point).describe("Exactly three"),
  investor_lens: z.string(),
});
export type InvestibilityOutput = z.infer<typeof investibilitySchema>;

/* ── Module 3: Pivot Matrix ────────────────────────────────────────── */

export const pivotsSchema = z.object({
  pivots: z.array(
    z.object({
      title: z.string(),
      pivot_thesis: z.string(),
      what_changes: z.string(),
      target_market: z.string(),
      business_model_shift: z.string(),
      rationale: z.string(),
      difficulty: z.enum(["low", "medium", "high"]),
      expected_score_delta: z.number().int(),
    }),
  ),
});
export type PivotsOutput = z.infer<typeof pivotsSchema>;

/* ── Module 4: Pitch Deck ──────────────────────────────────────────── */

export const deckSchema = z.object({
  narrative_summary: z.string(),
  slides: z.array(
    z.object({
      key: z.enum([
        "hook",
        "solution",
        "market",
        "moat",
        "competition",
        "business_model",
        "gtm",
        "team",
        "financials",
        "ask",
      ]),
      title: z.string(),
      headline: z.string(),
      bullets: z.array(z.string()),
      speaker_notes: z.string(),
    }),
  ),
  ask: z.object({
    amount_inr: z.number(),
    amount_display: z.string(),
    runway_months: z.number().int(),
    use_of_funds: z.array(z.object({ bucket: z.string(), percent: z.number().int() })),
  }),
});
export type DeckOutput = z.infer<typeof deckSchema>;

/* ── Module 5: Matching, outreach, benchmarks, grants ──────────────── */

export const matchRationaleSchema = z.object({
  rationales: z.array(z.object({ investor_name: z.string(), rationale: z.string() })),
});

export const outreachSchema = z.object({
  email: z.object({ subject: z.string(), body: z.string() }),
  linkedin: z.object({ body: z.string() }),
});
export type OutreachOutput = z.infer<typeof outreachSchema>;

export const benchmarkCompareSchema = z.object({
  comparisons: z.array(
    z.object({ startup_name: z.string(), parallel_analysis: z.string(), lesson: z.string() }),
  ),
});

export const grantMatchSchema = z.object({
  matches: z.array(
    z.object({
      grant_name: z.string(),
      fit_rationale: z.string(),
      eligibility_note: z.string(),
      next_step: z.string(),
      fit_score: score,
    }),
  ),
});

export const elevatorFeedbackSchema = z.object({
  score,
  what_landed: z.array(z.string()),
  what_failed: z.array(z.string()),
  rewritten_pitch: z.string(),
});

/* ── Evidence: Mom Test interview scoring ──────────────────────────── */

export const interviewScoreSchema = z.object({
  what_worked: z.array(z.string()).describe("Quote the good questions"),
  what_failed: z.array(z.string()).describe("Quote the bad questions and say why"),
  strongest_signal: z.string(),
  biggest_unknown: z.string(),
  rewritten_questions: z.array(z.string()).describe("Three Mom Test rewrites"),
  score,
});
export type InterviewScoreOutput = z.infer<typeof interviewScoreSchema>;

/* ── Readiness: TRL / IRL ──────────────────────────────────────────── */

export const readinessSchema = z.object({
  justification: z.string(),
  evidence_cited: z.array(z.string()),
  level: z.number().int().min(1).max(9),
  is_self_declared: z.boolean().describe("True when no supporting evidence exists"),
  gaps: z.array(z.object({ gap: z.string(), blocks_level: z.number().int() })),
  next_actions: z.array(z.object({ action: z.string(), effort: z.enum(["low", "medium", "high"]) })),
});
export type ReadinessOutput = z.infer<typeof readinessSchema>;

/* ── IP: prior art ─────────────────────────────────────────────────── */

export const priorArtSchema = z.object({
  search_strategy: z.object({
    queries: z.array(z.string()),
    classification_codes: z.array(z.object({ code: z.string(), covers: z.string() })),
    databases: z.array(z.string()),
    novelty_hinges_on: z.string(),
  }),
  novelty_verdict: z.enum(["likely_novel", "crowded", "blocked", "inconclusive"]),
  novelty_analysis: z.string(),
  differentiators: z.array(z.object({ feature: z.string(), likely_novel: z.boolean(), note: z.string() })),
  filing_recommendation: z.enum([
    "provisional",
    "complete",
    "trade_secret",
    "defensive_publication",
    "not_yet",
    "seek_counsel",
  ]),
  recommended_action: z.string(),
  disclosure_warning: z.string().nullable(),
});
export type PriorArtOutput = z.infer<typeof priorArtSchema>;

/* ── Team: co-founder fit ──────────────────────────────────────────── */

export const cofounderRationaleSchema = z.object({
  assessments: z.array(
    z.object({
      candidate_name: z.string(),
      gap_closed: z.string(),
      friction_risk: z.string(),
    }),
  ),
  still_missing: z.string(),
});

/* ── Industry: problem fit ─────────────────────────────────────────── */

export const problemFitSchema = z.object({
  fits: z.array(
    z.object({
      problem_title: z.string(),
      rationale: z.string(),
      capability_gap: z.string(),
      is_services_engagement: z.boolean(),
      fit_score: score,
    }),
  ),
});
