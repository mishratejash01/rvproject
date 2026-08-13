-- Live Indian startup benchmarks (researched, sourced, dated) plus the
-- per-project AI comparison links ("your project vs Sarvam at your stage").

create table public.benchmarks (
  id bigint generated always as identity primary key,
  startup_name text not null unique,
  sector_slug text not null,
  subsector text,
  founded_year int,
  hq_city text,
  stage text not null check (stage in ('seed', 'early', 'growth', 'unicorn', 'public')),
  total_funding_usd numeric,
  last_round text,
  last_round_date text,
  valuation_usd numeric,
  valuation_display text,
  key_metric text,
  founding_story text,
  student_relevance text,
  source_url text,
  as_of_date text,
  created_at timestamptz not null default now()
);

create index benchmarks_sector_idx on public.benchmarks (sector_slug);

create table public.benchmark_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  benchmark_id bigint not null references public.benchmarks (id) on delete cascade,
  parallel_analysis text not null,   -- AI: the operational/valuation parallel drawn
  lesson text,                       -- the one tactic the student should copy
  created_at timestamptz not null default now(),
  unique (project_id, benchmark_id)
);

create index benchmark_links_project_idx on public.benchmark_links (project_id);
create index benchmark_links_benchmark_idx on public.benchmark_links (benchmark_id);

alter table public.benchmarks enable row level security;
alter table public.benchmark_links enable row level security;

create policy benchmarks_read on public.benchmarks
  for select to anon, authenticated using (true);

create policy benchmark_links_read on public.benchmark_links
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy benchmark_links_owner_write on public.benchmark_links
  for insert to authenticated
  with check ((select public.owns_project(project_id)));
