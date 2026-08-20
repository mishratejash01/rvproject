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
  role: "student" | "faculty" | "mentor" | "admin";
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

/* ── Evidence ledger ───────────────────────────────────────────────── */

export type EvidenceType = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: "conversation" | "observation" | "commitment" | "experiment" | "desk_research";
  is_behavioural: boolean;
  base_strength: number;
  guidance: string;
  sort_order: number;
};

export type MomTest = {
  score: number;
  what_worked: string[];
  what_failed: string[];
  strongest_signal: string;
  biggest_unknown: string;
  rewritten_questions: string[];
};

export type Evidence = {
  id: string;
  project_id: string;
  type_id: number;
  title: string;
  summary: string;
  occurred_on: string;
  sample_size: number;
  source_name: string | null;
  source_role: string | null;
  source_org: string | null;
  artifact_url: string | null;
  transcript: string | null;
  mom_test: MomTest | null;
  outcome: string | null;
  strength_score: number;
  verified_at: string | null;
  created_at: string;
  type?: EvidenceType;
};

/* ── Readiness ─────────────────────────────────────────────────────── */

export type ReadinessLevel = {
  id: number;
  scale: "trl" | "irl";
  level: number;
  name: string;
  description: string;
  evidence_required: string;
};

export type ReadinessAssessment = {
  id: string;
  project_id: string;
  scale: "trl" | "irl";
  level: number;
  justification: string;
  gaps: Array<{ gap: string; blocks_level: number }>;
  next_actions: Array<{ action: string; effort: "low" | "medium" | "high" }>;
  verified_at: string | null;
  created_at: string;
};

/* ── Team ──────────────────────────────────────────────────────────── */

export type Skill = {
  id: number;
  slug: string;
  name: string;
  category: "engineering" | "data_ai" | "hardware" | "design" | "business" | "domain";
  sort_order: number;
};

export type CofounderProfile = {
  user_id: string;
  headline: string;
  bio: string | null;
  skills: string[];
  looking_for: string[];
  interests: string[];
  commitment: string;
  hours_per_week: number | null;
  has_idea: boolean;
  portfolio_url: string | null;
  is_seeking: boolean;
  updated_at: string;
};

export type CofounderMatch = {
  user_id: string;
  full_name: string;
  branch: string | null;
  campus: string | null;
  headline: string;
  skills: string[];
  commitment: string;
  portfolio_url: string | null;
  fit_score: number;
  fit_breakdown: Record<string, number>;
  fills_gaps: string[];
  gap_closed: string | null;
  friction_risk: string | null;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role_title: string;
  responsibilities: string | null;
  equity_percent: number | null;
  vesting_months: number;
  cliff_months: number;
  joined_on: string;
  is_founder: boolean;
};

export type FoundersAgreement = {
  id: string;
  project_id: string;
  version: number;
  terms: Record<string, unknown>;
  document: string;
  generated_at: string;
};

/* ── Industry problems ─────────────────────────────────────────────── */

export type IndustryPartner = {
  id: number;
  name: string;
  sector: string;
  organisation_type: string;
  city: string | null;
  website: string | null;
  has_mou: boolean;
  is_verified: boolean;
};

export type IndustryProblem = {
  id: string;
  partner_id: number;
  title: string;
  problem_statement: string;
  context: string | null;
  constraints: string | null;
  desired_outcome: string;
  domain_id: number | null;
  urgency: "low" | "medium" | "high";
  stakeholder_available: boolean;
  data_available: boolean;
  pilot_possible: boolean;
  status: string;
  posted_on: string;
  closes_on: string | null;
  partner?: IndustryPartner;
  domain?: Domain;
};

/* ── IP ────────────────────────────────────────────────────────────── */

export type PriorArtSearch = {
  id: string;
  project_id: string;
  search_strategy: {
    queries: string[];
    classification_codes: Array<{ code: string; covers: string }>;
    databases: string[];
    novelty_hinges_on: string;
  };
  findings: Array<Record<string, unknown>>;
  novelty_verdict: "likely_novel" | "crowded" | "blocked" | "inconclusive" | null;
  novelty_analysis: string | null;
  differentiators: Array<{ feature: string; likely_novel: boolean; note: string }>;
  recommended_action: string | null;
  filing_recommendation: string | null;
  created_at: string;
};

export type Patent = {
  id: string;
  project_id: string | null;
  title: string;
  inventors: string[];
  application_number: string | null;
  patent_number: string | null;
  status: string;
  filed_on: string | null;
  published_on: string | null;
  granted_on: string | null;
  is_prototype_only: boolean;
  academic_year: string | null;
};

export type IpPolicy = {
  id: number;
  campus_id: number | null;
  title: string;
  summary: string;
  ownership_rule: string;
  student_share: string | null;
  requires_disclosure: boolean;
  policy_url: string | null;
};

/* ── Cohorts and mentors ───────────────────────────────────────────── */

export type Cohort = {
  id: string;
  name: string;
  campus_id: number | null;
  description: string | null;
  starts_on: string;
  ends_on: string;
  status: string;
  application_closes_on: string | null;
};

export type Milestone = {
  id: string;
  cohort_id: string;
  name: string;
  description: string;
  week_number: number;
  is_stage_gate: boolean;
  required_evidence_types: string[];
  sort_order: number;
};

export type MilestoneProgress = {
  id: string;
  milestone_id: string;
  project_id: string;
  status: "not_started" | "in_progress" | "submitted" | "passed" | "needs_work";
  submission_note: string | null;
  reviewer_note: string | null;
  completed_on: string | null;
};

export type Mentor = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  organisation: string | null;
  designation: string | null;
  expertise: string[];
  domains: string[];
  is_faculty: boolean;
  linkedin_url: string | null;
  bio: string | null;
  capacity: number;
  is_active: boolean;
};

export type MentorSession = {
  id: string;
  assignment_id: string;
  held_on: string;
  duration_minutes: number;
  topics: string;
  advice: string | null;
  action_items: Array<{ item: string; owner?: string; due_on?: string; done?: boolean }>;
};

/* ── Alumni, competitions, ventures ────────────────────────────────── */

export type Alumnus = {
  id: number;
  full_name: string;
  campus_id: number | null;
  batch_year: number | null;
  branch: string | null;
  current_position: string | null;
  organisation: string | null;
  is_founder: boolean;
  is_investor: boolean;
  company_name: string | null;
  company_stage: string | null;
  expertise: string[];
  domains: string[];
  city: string | null;
  linkedin_url: string | null;
  open_to_help: boolean;
  help_areas: string[];
};

export type Competition = {
  id: number;
  name: string;
  organiser: string;
  description: string;
  competition_type: string;
  domains: string[];
  eligibility: string;
  student_only: boolean;
  prize_display: string | null;
  prize_max_inr: number | null;
  leads_to: string | null;
  typical_window: string | null;
  application_opens: string | null;
  application_closes: string | null;
  url: string | null;
  source_url: string | null;
};

export type StudentVenture = {
  id: string;
  project_id: string | null;
  legal_name: string;
  nature_of_startup: string;
  entity_type: string;
  cin: string | null;
  date_of_commencement: string;
  dpiit_number: string | null;
  dpiit_recognised_on: string | null;
  is_incubated_on_campus: boolean;
  graduating_batch_year: number | null;
  programme: string | null;
  is_operating: boolean;
  academic_year: string | null;
};

/* ── Financial model ───────────────────────────────────────────────── */

export type FinancialAssumptions = {
  price_per_unit: number;
  gross_margin_percent: number;
  cac: number;
  monthly_churn_percent: number;
  starting_customers: number;
  monthly_new_customers: number;
  growth_rate_percent: number;
  fixed_costs_monthly: number;
  team_cost_monthly: number;
  starting_cash: number;
  months: number;
};

export type FinancialModel = {
  id: string;
  project_id: string;
  version: number;
  currency: string;
  assumptions: FinancialAssumptions;
  projections: Array<Record<string, number>>;
  summary: Record<string, number | null>;
  created_at: string;
};

/* ── Archive ───────────────────────────────────────────────────────── */

export type ArchiveRow = {
  id: string;
  title: string;
  share_slug: string;
  problem_statement: string;
  status: string;
  created_at: string;
  domain_name: string;
  domain_slug: string;
  founder_name: string | null;
  campus: string | null;
  branch: string | null;
  project_year: number;
  viability_score: number | null;
  pain_classification: string | null;
  headline: string | null;
  verdict: string | null;
  venture_name: string | null;
  dpiit_number: string | null;
};
