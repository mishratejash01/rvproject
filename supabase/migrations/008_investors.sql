-- Module 5 reference data: real Indian early-stage investors, researched and
-- sourced. GIN indexes power sector/stage array-overlap matching in SQL.

create table public.investors (
  id bigint generated always as identity primary key,
  name text not null unique,
  firm_type text not null check (
    firm_type in ('vc', 'micro_vc', 'angel_network', 'accelerator', 'family_office', 'corporate_vc', 'govt_fund')
  ),
  stages text[] not null default '{}',
  sectors text[] not null default '{}',
  cheque_min_usd numeric,
  cheque_max_usd numeric,
  cheque_display text,
  thesis text not null,
  notable_portfolio text[] not null default '{}',
  hq_city text,
  geography_focus text default 'India',
  apply_url text,
  website text,
  linkedin_url text,
  works_with_student_founders boolean not null default false,
  is_active boolean not null default true,
  source_url text,
  as_of_date text,
  created_at timestamptz not null default now()
);

create index investors_sectors_idx on public.investors using gin (sectors);
create index investors_stages_idx on public.investors using gin (stages);
create index investors_active_idx on public.investors (is_active) where is_active;

alter table public.investors enable row level security;

create policy investors_read on public.investors
  for select to anon, authenticated using (true);
