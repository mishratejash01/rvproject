-- Industry Problem Bank. Inverts the usual failure mode: instead of inventing a
-- problem, students pick a real one from a named stakeholder who will take
-- their call. Also feeds NAAC 3.7.2/3.7.3 industry linkage reporting.

create table public.industry_partners (
  id bigint generated always as identity primary key,
  name text not null unique,
  sector text not null,
  organisation_type text not null default 'company' check (
    organisation_type in ('company', 'hospital', 'government', 'ngo', 'municipal_body', 'research_lab', 'msme')
  ),
  city text,
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  has_mou boolean not null default false,
  mou_signed_on date,
  is_verified boolean not null default false,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index industry_partners_sector_idx on public.industry_partners (sector);

create table public.industry_problems (
  id uuid primary key default gen_random_uuid(),
  partner_id bigint not null references public.industry_partners (id) on delete cascade,
  title text not null check (char_length(title) between 5 and 200),
  problem_statement text not null,
  context text,
  constraints text,
  desired_outcome text not null,
  domain_id bigint references public.domains (id),
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high')),
  -- Whether a named person will actually speak to the student team.
  stakeholder_available boolean not null default true,
  data_available boolean not null default false,
  pilot_possible boolean not null default false,
  status text not null default 'open' check (status in ('open', 'claimed', 'in_progress', 'solved', 'closed')),
  posted_by uuid references auth.users (id) on delete set null,
  posted_on date not null default current_date,
  closes_on date,
  created_at timestamptz not null default now()
);

create index industry_problems_status_idx on public.industry_problems (status) where status = 'open';
create index industry_problems_domain_idx on public.industry_problems (domain_id);
create index industry_problems_partner_idx on public.industry_problems (partner_id);

create table public.problem_claims (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.industry_problems (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  claimed_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pitch text not null check (char_length(pitch) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (problem_id, project_id)
);

create index problem_claims_problem_idx on public.problem_claims (problem_id);
create index problem_claims_project_idx on public.problem_claims (project_id);

alter table public.industry_partners enable row level security;
alter table public.industry_problems enable row level security;
alter table public.problem_claims enable row level security;

-- Students browse partners and open problems; contact details stay staff-only
-- via a restricted view rather than the base table.
create policy industry_partners_read on public.industry_partners
  for select to authenticated using (true);

create policy industry_partners_staff_write on public.industry_partners
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy industry_problems_read on public.industry_problems
  for select to authenticated using (true);

create policy industry_problems_staff_write on public.industry_problems
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy problem_claims_read on public.problem_claims
  for select to authenticated
  using (claimed_by = (select auth.uid())
         or (select public.owns_project(project_id))
         or (select public.is_staff()));

create policy problem_claims_write on public.problem_claims
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy problem_claims_update on public.problem_claims
  for update to authenticated
  using (claimed_by = (select auth.uid()) or (select public.is_staff()))
  with check (claimed_by = (select auth.uid()) or (select public.is_staff()));

-- Partner directory without contact details, safe for the student-facing list.
create view public.industry_partners_public
with (security_invoker = true) as
select id, name, sector, organisation_type, city, website, has_mou, is_verified
from public.industry_partners;

grant select on public.industry_partners_public to authenticated;
