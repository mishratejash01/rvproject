-- Institutional memory. Full-text search across every project the institution
-- has ever produced, so juniors build on seniors instead of repeating them.

alter table public.projects
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(problem_statement, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(target_persona, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(technical_approach, '')), 'C')
  ) stored;

create index if not exists projects_search_idx on public.projects using gin (search_vector);
create index if not exists projects_created_idx on public.projects (created_at desc);

-- The archive exposes only shared projects, with the founder and campus the
-- leaderboard already surfaces. Runs as owner so the profile join resolves;
-- the is_public predicate remains the security boundary.
create view public.project_archive
with (security_invoker = false) as
select
  p.id,
  p.title,
  p.share_slug,
  p.problem_statement,
  p.target_persona,
  p.technical_approach,
  p.status,
  p.created_at,
  d.name as domain_name,
  d.slug as domain_slug,
  pr.full_name as founder_name,
  c.short_name as campus,
  pr.branch,
  extract(year from p.created_at)::int as project_year,
  v.viability_score,
  v.pain_classification,
  v.headline,
  ir.verdict,
  sv.legal_name as venture_name,
  sv.dpiit_number
from public.projects p
join public.domains d on d.id = p.domain_id
left join public.profiles pr on pr.id = p.owner_id
left join public.campuses c on c.id = pr.campus_id
left join lateral (
  select viability_score, pain_classification, headline
  from public.validations v
  where v.project_id = p.id
  order by v.version desc limit 1
) v on true
left join lateral (
  select verdict from public.investibility_reports ir
  where ir.project_id = p.id
  order by ir.version desc limit 1
) ir on true
left join lateral (
  select legal_name, dpiit_number from public.student_ventures sv
  where sv.project_id = p.id
  order by created_at desc limit 1
) sv on true
where p.is_public;

grant select on public.project_archive to anon, authenticated;
