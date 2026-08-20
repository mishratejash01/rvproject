-- Technology Readiness Level and Investment Readiness Level.
-- TRL is what DST, BIRAC, iDEX and NIDHI applications actually ask for, so a
-- claimed level has to carry the evidence that justifies it.

create table public.readiness_levels (
  id bigint generated always as identity primary key,
  scale text not null check (scale in ('trl', 'irl')),
  level int not null check (level between 1 and 9),
  name text not null,
  description text not null,
  evidence_required text not null,
  unique (scale, level)
);

create table public.readiness_assessments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  scale text not null check (scale in ('trl', 'irl')),
  level int not null check (level between 1 and 9),
  justification text not null,
  gaps jsonb not null default '[]'::jsonb,      -- what is missing to reach the next level
  next_actions jsonb not null default '[]'::jsonb,
  assessed_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  model_used text,
  created_at timestamptz not null default now()
);

create index readiness_project_idx on public.readiness_assessments (project_id, scale, created_at desc);

alter table public.readiness_levels enable row level security;
alter table public.readiness_assessments enable row level security;

create policy readiness_levels_read on public.readiness_levels
  for select to anon, authenticated using (true);

create policy readiness_read on public.readiness_assessments
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy readiness_owner_write on public.readiness_assessments
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy readiness_staff_update on public.readiness_assessments
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
