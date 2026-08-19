-- The leaderboard joins profiles for founder name and campus, but anonymous
-- visitors cannot read profiles, so those columns came back null and a campus
-- leaderboard lost its campus.
--
-- Switching the view to run as its owner lets it read the two columns it
-- projects while the `is_public` predicate inside the view remains the security
-- boundary: nothing that is not explicitly shared can ever appear here, and no
-- other profile column is exposed.

drop view if exists public.leaderboard;

create view public.leaderboard
with (security_invoker = false) as
select
  p.id as project_id,
  p.title,
  p.share_slug,
  p.domain_id,
  d.name as domain_name,
  d.slug as domain_slug,
  pr.full_name as founder_name,
  c.short_name as campus,
  v.viability_score,
  v.pain_classification,
  v.headline,
  ir.verdict,
  ir.readiness_score,
  p.updated_at
from public.projects p
join public.domains d on d.id = p.domain_id
left join public.profiles pr on pr.id = p.owner_id
left join public.campuses c on c.id = pr.campus_id
left join lateral (
  select viability_score, pain_classification, headline
  from public.validations v
  where v.project_id = p.id
  order by v.version desc
  limit 1
) v on true
left join lateral (
  select verdict, readiness_score
  from public.investibility_reports ir
  where ir.project_id = p.id
  order by ir.version desc
  limit 1
) ir on true
where p.is_public and v.viability_score is not null;

grant select on public.leaderboard to anon, authenticated;
