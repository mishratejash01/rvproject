-- Co-founder formation. Student teams stall because the CS student never meets
-- the mechanical student, and they split equity equally on day one with no
-- vesting — which detonates the moment somebody graduates or takes a job.

create table public.cofounder_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  headline text not null check (char_length(headline) between 5 and 160),
  bio text,
  skills text[] not null default '{}',        -- skill slugs the person HAS
  looking_for text[] not null default '{}',   -- skill slugs the person NEEDS
  interests text[] not null default '{}',     -- domain slugs
  commitment text not null default 'exploring'
    check (commitment in ('exploring', 'side_project', 'part_time', 'full_time_after_graduation', 'full_time_now')),
  hours_per_week int check (hours_per_week between 1 and 80),
  has_idea boolean not null default false,
  portfolio_url text,
  is_seeking boolean not null default true,
  updated_at timestamptz not null default now()
);

create index cofounder_seeking_idx on public.cofounder_profiles (is_seeking) where is_seeking;
create index cofounder_skills_idx on public.cofounder_profiles using gin (skills);
create index cofounder_looking_idx on public.cofounder_profiles using gin (looking_for);

create table public.cofounder_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null default auth.uid() references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  message text not null check (char_length(message) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_user <> to_user),
  unique (from_user, to_user, project_id)
);

create index cofounder_requests_to_idx on public.cofounder_requests (to_user, status);
create index cofounder_requests_from_idx on public.cofounder_requests (from_user);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role_title text not null default 'Co-founder',
  responsibilities text,
  equity_percent numeric check (equity_percent >= 0 and equity_percent <= 100),
  vesting_months int not null default 48 check (vesting_months between 0 and 96),
  cliff_months int not null default 12 check (cliff_months >= 0),
  joined_on date not null default current_date,
  is_founder boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_project_idx on public.project_members (project_id);
create index project_members_user_idx on public.project_members (user_id);

create table public.founders_agreements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version int not null default 1,
  terms jsonb not null,          -- roles, splits, vesting, IP assignment, exit and deadlock terms
  document text not null,        -- rendered agreement text
  generated_at timestamptz not null default now(),
  unique (project_id, version)
);

create index founders_agreements_project_idx on public.founders_agreements (project_id, version desc);

alter table public.cofounder_profiles enable row level security;
alter table public.cofounder_requests enable row level security;
alter table public.project_members enable row level security;
alter table public.founders_agreements enable row level security;

-- Discoverability is the point: any signed-in student can browse people who are
-- actively seeking. Anonymous visitors cannot.
create policy cofounder_profiles_read on public.cofounder_profiles
  for select to authenticated using (true);

create policy cofounder_profiles_write on public.cofounder_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy cofounder_requests_read on public.cofounder_requests
  for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

create policy cofounder_requests_send on public.cofounder_requests
  for insert to authenticated
  with check (from_user = (select auth.uid()));

-- Only the recipient may accept or decline.
create policy cofounder_requests_respond on public.cofounder_requests
  for update to authenticated
  using (to_user = (select auth.uid()))
  with check (to_user = (select auth.uid()));

create policy project_members_read on public.project_members
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy project_members_owner_write on public.project_members
  for all to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)));

create policy founders_agreements_read on public.founders_agreements
  for select to authenticated
  using ((select public.owns_project(project_id)));

create policy founders_agreements_write on public.founders_agreements
  for insert to authenticated
  with check ((select public.owns_project(project_id)));
