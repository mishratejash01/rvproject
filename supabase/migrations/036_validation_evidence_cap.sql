-- Evidence-capped scoring. The model's judgement is retained as `ai_score`, but
-- the score a student sees is bounded by how much they can actually prove.
--
--   cap = 40 + 0.6 x evidence_score      (0 evidence -> 40, full evidence -> 100)
--
-- This is what stops the headline number from being an opinion about a
-- paragraph, and it is deliberately computed in SQL so it is auditable.

alter table public.validations
  add column if not exists ai_score int,
  add column if not exists evidence_score numeric not null default 0,
  add column if not exists evidence_cap numeric not null default 40,
  add column if not exists evidence_count int not null default 0;

-- Backfill: existing rows predate the ledger, so their AI score stands as-is.
update public.validations
set ai_score = viability_score
where ai_score is null;

create or replace function public.evidence_cap_for(p_evidence_score numeric)
returns numeric
language sql
immutable
as $$
  select least(100, 40 + 0.6 * coalesce(p_evidence_score, 0));
$$;
