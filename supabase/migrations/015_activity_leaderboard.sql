-- Activity trail (feeds the personal timeline + admin Command Center) and the
-- campus leaderboard view. Public share pages count views via a definer RPC.

create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  event_type text not null,          -- validated | verdict | pivoted | deck_generated | matched | outreach_drafted | roasted | ic_defended | shared
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_user_idx on public.activity_log (user_id, created_at desc);
create index activity_project_idx on public.activity_log (project_id);
create index activity_created_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

create policy activity_read on public.activity_log
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy activity_write on public.activity_log
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Campus leaderboard: latest validation + verdict per public project.
-- security_invoker so underlying RLS (public projects only) applies.
create view public.leaderboard
with (security_invoker = true) as
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

-- Public pitch-page view counter, callable by anonymous visitors.
create or replace function public.increment_share_view(slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.projects
  set share_views = share_views + 1
  where share_slug = slug and is_public;
$$;

grant execute on function public.increment_share_view(text) to anon, authenticated;
