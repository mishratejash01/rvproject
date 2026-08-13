-- Module 3 output: strategic pivots generated when validation exposes weaknesses.
-- `adopted` marks the pivot the founder committed to (drives project re-validation).

create table public.pivots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  validation_id uuid references public.validations (id) on delete set null,
  title text not null,
  pivot_thesis text not null,             -- the new positioning in one paragraph
  what_changes text not null,             -- concrete delta from the current idea
  target_market text not null,
  business_model_shift text,              -- e.g. "B2C utility → B2B SaaS infrastructure"
  difficulty text not null check (difficulty in ('low', 'medium', 'high')),
  expected_score_delta int not null,      -- projected viability improvement
  rationale text not null,                -- why this pivot beats the weakness found
  adopted boolean not null default false,
  created_at timestamptz not null default now()
);

create index pivots_project_id_idx on public.pivots (project_id);
create index pivots_validation_id_idx on public.pivots (validation_id);

alter table public.pivots enable row level security;

create policy pivots_read on public.pivots
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy pivots_owner_write on public.pivots
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy pivots_owner_update on public.pivots
  for update to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)));
