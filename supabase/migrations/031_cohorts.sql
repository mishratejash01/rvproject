-- Incubation programme operations: cohorts, stage-gated milestones and the
-- progress record a faculty coordinator actually needs to run a batch.

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campus_id bigint references public.campuses (id),
  description text,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'open', 'running', 'completed', 'archived')),
  application_closes_on date,
  coordinator_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index cohorts_status_idx on public.cohorts (status);

create table public.cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  status text not null default 'applied' check (status in ('applied', 'accepted', 'active', 'graduated', 'withdrawn', 'rejected')),
  applied_on timestamptz not null default now(),
  decided_at timestamptz,
  unique (cohort_id, project_id)
);

create index cohort_members_cohort_idx on public.cohort_members (cohort_id, status);
create index cohort_members_project_idx on public.cohort_members (project_id);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  name text not null,
  description text not null,
  week_number int not null check (week_number >= 0),
  is_stage_gate boolean not null default false,
  required_evidence_types text[] not null default '{}',   -- evidence_type slugs a team must supply
  sort_order int not null default 100
);

create index milestones_cohort_idx on public.milestones (cohort_id, week_number);

create table public.milestone_progress (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  status text not null default 'not_started' check (
    status in ('not_started', 'in_progress', 'submitted', 'passed', 'needs_work')
  ),
  submission_note text,
  reviewer_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  completed_on timestamptz,
  updated_at timestamptz not null default now(),
  unique (milestone_id, project_id)
);

create index milestone_progress_project_idx on public.milestone_progress (project_id);

alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_progress enable row level security;

create policy cohorts_read on public.cohorts
  for select to authenticated using (true);

create policy cohorts_staff_write on public.cohorts
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy cohort_members_read on public.cohort_members
  for select to authenticated
  using ((select public.owns_project(project_id)) or (select public.is_staff()));

create policy cohort_members_apply on public.cohort_members
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy cohort_members_staff_update on public.cohort_members
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy milestones_read on public.milestones
  for select to authenticated using (true);

create policy milestones_staff_write on public.milestones
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy milestone_progress_read on public.milestone_progress
  for select to authenticated
  using ((select public.owns_project(project_id)) or (select public.is_staff()));

create policy milestone_progress_team_write on public.milestone_progress
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy milestone_progress_update on public.milestone_progress
  for update to authenticated
  using ((select public.owns_project(project_id)) or (select public.is_staff()))
  with check ((select public.owns_project(project_id)) or (select public.is_staff()));
