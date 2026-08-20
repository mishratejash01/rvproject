-- Financial model. Assumptions in, projections computed deterministically in
-- the client — no model is asked to invent numbers here.

create table public.financial_models (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version int not null default 1,
  currency text not null default 'INR',
  assumptions jsonb not null,        -- pricing, CAC, churn, COGS, salaries, headcount plan, months
  projections jsonb not null,        -- computed monthly series + summary metrics
  summary jsonb not null default '{}'::jsonb,   -- ltv, ltv_cac, payback, burn, runway, breakeven month
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index financial_models_project_idx on public.financial_models (project_id, version desc);

alter table public.financial_models enable row level security;

create policy financial_models_read on public.financial_models
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy financial_models_write on public.financial_models
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy financial_models_update on public.financial_models
  for update to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)));
