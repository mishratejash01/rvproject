-- Module 2 output: VC investibility verdicts benchmarked on the four filters
-- (founder-market fit, scalability, gross margins, moat).

create table public.investibility_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version int not null default 1,
  verdict text not null check (verdict in ('investible', 'academic')),
  verdict_label text not null,                      -- "Seed / Pre-Seed Investible" | "Academic Project Only"
  readiness_score int not null check (readiness_score between 0 and 100),
  filter_scores jsonb not null default '[]'::jsonb, -- [{key,label,score,reasoning}] x4
  verdict_bullets jsonb not null default '[]'::jsonb, -- exactly 3 {title,detail}
  investor_lens text,                                -- how a Tier-1 partner would frame it
  full_report jsonb not null default '{}'::jsonb,
  model_used text,
  roast_mode boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index investibility_project_id_idx on public.investibility_reports (project_id, version desc);

alter table public.investibility_reports enable row level security;

create policy investibility_read on public.investibility_reports
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy investibility_owner_write on public.investibility_reports
  for insert to authenticated
  with check ((select public.owns_project(project_id)));
