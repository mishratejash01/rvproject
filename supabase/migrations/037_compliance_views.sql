-- Accreditation returns generated straight from operational data.
-- Staff-only: every view runs with security_invoker so the caller's RLS applies,
-- and the underlying tables restrict writes to faculty and admins.

-- NBA Criterion 4.6 — Placement, Higher Studies and Entrepreneurship.
--   P = ((X + Y + Z) / FS) x 100,  Z = students taking up entrepreneurship
-- The manual forbids shrinking the denominator: if FS is below sanctioned
-- intake plus lateral entry, FS is raised to that sum.
create or replace view public.nba_placement_index
with (security_invoker = true) as
select
  b.campus_id,
  c.short_name as campus,
  b.programme,
  b.graduating_year,
  b.final_year_students as reported_fs,
  greatest(b.final_year_students, b.sanctioned_intake + b.lateral_entry) as fs,
  b.students_placed as x_placed,
  b.students_higher_studies as y_higher_studies,
  coalesce(v.venture_count, 0) as z_entrepreneurship,
  b.students_placed + b.students_higher_studies + coalesce(v.venture_count, 0) as xyz,
  round(
    (b.students_placed + b.students_higher_studies + coalesce(v.venture_count, 0))::numeric
    / nullif(greatest(b.final_year_students, b.sanctioned_intake + b.lateral_entry), 0) * 100
  , 2) as placement_index
from public.accreditation_batches b
join public.campuses c on c.id = b.campus_id
left join lateral (
  select count(*) as venture_count
  from public.student_ventures sv
  where sv.campus_id = b.campus_id
    and sv.graduating_batch_year = b.graduating_year
    and (sv.programme is null or sv.programme = b.programme)
) v on true;

-- NAAC AQAR 3.3.3 — start-ups by name, nature and date of commencement.
create or replace view public.aqar_startups
with (security_invoker = true) as
select
  sv.academic_year,
  c.short_name as campus,
  sv.legal_name as name_of_startup,
  sv.nature_of_startup,
  sv.date_of_commencement,
  sv.is_incubated_on_campus,
  sv.dpiit_number
from public.student_ventures sv
left join public.campuses c on c.id = sv.campus_id
order by sv.date_of_commencement desc;

-- NAAC AQAR 3.3.1 — IPR and entrepreneurship workshops (title, department, dates).
create or replace view public.aqar_activities
with (security_invoker = true) as
select
  a.academic_year,
  a.title as title_of_workshop_seminar,
  a.department,
  a.starts_on,
  a.ends_on,
  a.participants,
  a.theme,
  a.activity_type,
  a.report_url
from public.institution_activities a
where a.theme in ('ipr', 'entrepreneurship', 'innovation', 'research_methodology', 'skill_development')
order by a.starts_on desc;

-- NAAC AQAR 3.4.4 / NBA 6.2.3 — patents by status, number and date.
create or replace view public.aqar_patents
with (security_invoker = true) as
select
  p.academic_year,
  p.title as patent_details,
  p.status as patent_status,
  coalesce(p.patent_number, p.application_number) as patent_number,
  coalesce(p.granted_on, p.published_on, p.filed_on) as date_of_award,
  p.inventors,
  p.is_prototype_only
from public.patents p
order by coalesce(p.granted_on, p.published_on, p.filed_on) desc nulls last;

-- MoE IIC quarterly return: minimum three calendar activities per quarter.
create or replace view public.iic_quarterly
with (security_invoker = true) as
select
  academic_year,
  extract(quarter from starts_on)::int as calendar_quarter,
  count(*) filter (where is_iic_calendar_activity) as iic_calendar_activities,
  count(*) as total_activities,
  sum(participants) as total_participants,
  sum(faculty_involved) as faculty_involved,
  (count(*) filter (where is_iic_calendar_activity)) >= 3 as meets_quarterly_minimum
from public.institution_activities
group by academic_year, extract(quarter from starts_on)
order by academic_year desc, calendar_quarter;

grant select on public.nba_placement_index, public.aqar_startups, public.aqar_activities,
                public.aqar_patents, public.iic_quarterly
  to authenticated;
