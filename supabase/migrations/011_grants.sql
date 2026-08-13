-- Grant Radar reference data: real Indian non-dilutive programs (SISFS, ELEVATE,
-- NIDHI-PRAYAS...) plus per-project AI matches with eligibility notes.

create table public.grants (
  id bigint generated always as identity primary key,
  name text not null unique,
  agency text not null,
  program_type text not null check (program_type in ('grant', 'convertible', 'incubation', 'competition')),
  amount_max_inr numeric,
  amount_display text not null,
  domains text[] not null default '{all}',
  eligibility_summary text not null,
  student_friendly boolean not null default false,   -- can student teams w/o a company apply
  needs_registered_company boolean not null default true,
  how_to_apply text,
  url text,
  typical_timeline text,
  source_url text,
  as_of_date text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index grants_domains_idx on public.grants using gin (domains);
create index grants_student_idx on public.grants (student_friendly) where student_friendly;

create table public.grant_matches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  grant_id bigint not null references public.grants (id) on delete cascade,
  fit_score numeric not null check (fit_score between 0 and 100),
  fit_rationale text not null,
  eligibility_note text,            -- AI: what this team must do to qualify
  next_step text,                   -- concrete first action
  created_at timestamptz not null default now(),
  unique (project_id, grant_id)
);

create index grant_matches_project_idx on public.grant_matches (project_id, fit_score desc);
create index grant_matches_grant_idx on public.grant_matches (grant_id);

alter table public.grants enable row level security;
alter table public.grant_matches enable row level security;

create policy grants_read on public.grants
  for select to anon, authenticated using (true);

create policy grant_matches_read on public.grant_matches
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy grant_matches_owner_write on public.grant_matches
  for insert to authenticated
  with check ((select public.owns_project(project_id)));
