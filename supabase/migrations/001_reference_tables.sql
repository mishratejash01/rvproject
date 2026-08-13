-- Campuses and sector domains: institutional reference data.
-- Everything the UI renders comes from these tables — nothing is hardcoded client-side.

create table public.campuses (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  short_name text not null,
  city text not null default 'Bengaluru',
  ecosystem_note text, -- e.g. "Home of the Startup Ignition Cell (SIC)"
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create table public.domains (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null default 'cpu', -- lucide icon name, rendered client-side
  example_startups text,            -- short inline examples for the intake wizard
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

alter table public.campuses enable row level security;
alter table public.domains enable row level security;

create policy campuses_read on public.campuses
  for select to anon, authenticated using (true);

create policy domains_read on public.domains
  for select to anon, authenticated using (true);
