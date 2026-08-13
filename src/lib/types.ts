/** Shared row shapes mirroring the database schema. */

export type Campus = {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  city: string;
  ecosystem_note: string | null;
  sort_order: number;
};

export type Domain = {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  example_startups: string | null;
  sort_order: number;
};

export type Profile = {
  id: string;
  full_name: string | null;
  campus_id: number | null;
  branch: string | null;
  year_of_study: number | null;
  role: "student" | "admin";
  is_guest: boolean;
  created_at: string;
  campus?: Campus | null;
};

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  problem_statement: string;
  target_persona: string;
  technical_approach: string;
  domain_id: number;
  status: "draft" | "validated" | "pivoted" | "deck_ready" | "outreach";
  is_public: boolean;
  share_slug: string;
  share_views: number;
  roast_mode: boolean;
  created_at: string;
  updated_at: string;
  domain?: Domain;
};

export type SubScore = { key: string; label: string; reasoning: string; score: number };
export type MarketLeg = { method: string; value_usd: number; display: string };
export type Point = { title: string; detail: string };

export type Validation = {
  id: string;
  project_id: string;
  version: number;
  viability_score: number;
  pain_classification: "vitamin" | "painkiller";
  sub_scores: SubScore[];
  tam_usd: number | null;
  sam_usd: number | null;
  som_usd: number | null;
  market_sizing: { tam: MarketLeg; sam: MarketLeg; som: MarketLeg };
  defensibility: {
    analysis: string;
    is_wrapper: boolean;
    moat_type: string;
    moat_score: number;
    replication_risks: string[];
  };
  headline: string | null;
  summary: string | null;
  full_report: {
    weaknesses?: Point[];
    strengths?: Point[];
    pain_reasoning?: string;
    [key: string]: unknown;
  };
  model_used: string | null;
  roast_mode: boolean;
  created_at: string;
};

export type InvestibilityReport = {
  id: string;
  project_id: string;
  version: number;
  verdict: "investible" | "academic";
  verdict_label: string;
  readiness_score: number;
  filter_scores: SubScore[];
  verdict_bullets: Point[];
  investor_lens: string | null;
  created_at: string;
};

export type Pivot = {
  id: string;
  project_id: string;
  title: string;
  pivot_thesis: string;
  what_changes: string;
  target_market: string;
  business_model_shift: string | null;
  difficulty: "low" | "medium" | "high";
  expected_score_delta: number;
  rationale: string;
  adopted: boolean;
  created_at: string;
};

export type Slide = {
  key: string;
  title: string;
  headline: string;
  bullets: string[];
  speaker_notes: string;
};

export type Deck = {
  id: string;
  project_id: string;
  version: number;
  slides: Slide[];
  narrative_summary: string | null;
  created_at: string;
};

export type Investor = {
  id: number;
  name: string;
  firm_type: string;
  stages: string[];
  sectors: string[];
  cheque_min_usd: number | null;
  cheque_max_usd: number | null;
  cheque_display: string | null;
  thesis: string;
  notable_portfolio: string[];
  hq_city: string | null;
  geography_focus: string | null;
  apply_url: string | null;
  website: string | null;
  linkedin_url: string | null;
  works_with_student_founders: boolean;
  source_url: string | null;
  as_of_date: string | null;
};

export type InvestorMatch = {
  id: string;
  project_id: string;
  investor_id: number;
  fit_score: number;
  fit_breakdown: Record<string, number>;
  rationale: string | null;
  investor: Investor;
};

export type OutreachDraft = {
  id: string;
  project_id: string;
  investor_id: number;
  channel: "email" | "linkedin";
  subject: string | null;
  body: string;
  status: "draft" | "sent";
  sent_at: string | null;
  created_at: string;
};

export type Benchmark = {
  id: number;
  startup_name: string;
  sector_slug: string;
  subsector: string | null;
  founded_year: number | null;
  hq_city: string | null;
  stage: string;
  total_funding_usd: number | null;
  last_round: string | null;
  last_round_date: string | null;
  valuation_usd: number | null;
  valuation_display: string | null;
  key_metric: string | null;
  founding_story: string | null;
  student_relevance: string | null;
  source_url: string | null;
  as_of_date: string | null;
};

export type BenchmarkLink = {
  id: string;
  project_id: string;
  benchmark_id: number;
  parallel_analysis: string;
  lesson: string | null;
  benchmark: Benchmark;
};

export type Grant = {
  id: number;
  name: string;
  agency: string;
  program_type: string;
  amount_max_inr: number | null;
  amount_display: string;
  domains: string[];
  eligibility_summary: string;
  student_friendly: boolean;
  needs_registered_company: boolean;
  how_to_apply: string | null;
  url: string | null;
  typical_timeline: string | null;
  source_url: string | null;
};

export type GrantMatch = {
  id: string;
  project_id: string;
  grant_id: number;
  fit_score: number;
  fit_rationale: string;
  eligibility_note: string | null;
  next_step: string | null;
  grant: Grant;
};

export type GlossaryTerm = {
  id: number;
  term: string;
  short_def: string;
  long_def: string;
  example: string | null;
  category: string;
  related_terms: string[];
};

export type ChatMessage = {
  id: number;
  session_id: string;
  role: "user" | "assistant";
  persona: string | null;
  content: string;
  created_at: string;
};

export type LeaderboardRow = {
  project_id: string;
  title: string;
  share_slug: string;
  domain_id: number;
  domain_name: string;
  domain_slug: string;
  founder_name: string | null;
  campus: string | null;
  viability_score: number;
  pain_classification: string;
  headline: string | null;
  verdict: string | null;
  readiness_score: number | null;
  updated_at: string;
};
