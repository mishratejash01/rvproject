-- Module 1 output: versioned validation reports. Every re-validation inserts a
-- new version so the score timeline (iteration intelligence) is queryable.

create table public.validations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version int not null default 1,
  viability_score int not null check (viability_score between 0 and 100),
  pain_classification text not null check (pain_classification in ('vitamin', 'painkiller')),
  sub_scores jsonb not null default '[]'::jsonb,      -- [{key,label,score,reasoning}]
  tam_usd numeric,
  sam_usd numeric,
  som_usd numeric,
  market_sizing jsonb not null default '{}'::jsonb,   -- {tam:{value,method},sam:...,som:...}
  defensibility jsonb not null default '{}'::jsonb,   -- {moat_score,moat_type,is_wrapper,analysis,risks[]}
  headline text,                                       -- one-line verdict for cards
  summary text,
  full_report jsonb not null default '{}'::jsonb,      -- complete structured AI output
  model_used text,
  roast_mode boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index validations_project_id_idx on public.validations (project_id, version desc);

alter table public.validations enable row level security;

create policy validations_read on public.validations
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy validations_owner_write on public.validations
  for insert to authenticated
  with check ((select public.owns_project(project_id)));
