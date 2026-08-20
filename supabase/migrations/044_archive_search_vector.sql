-- The archive view must expose the search vector, otherwise full-text queries
-- against it have nothing to match on.

drop view if exists public.project_archive;

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
  p.search_vector,
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
