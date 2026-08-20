-- Alumni founder/investor register and the competition calendar. Both are
-- reference data the institution curates, readable by every signed-in student.

create table public.alumni (
  id bigint generated always as identity primary key,
  full_name text not null,
  campus_id bigint references public.campuses (id),
  batch_year int,
  branch text,
  current_position text,
  organisation text,
  is_founder boolean not null default false,
  is_investor boolean not null default false,
  company_name text,
  company_stage text,
  expertise text[] not null default '{}',
  domains text[] not null default '{}',
  city text,
  linkedin_url text,
  open_to_help boolean not null default false,
  help_areas text[] not null default '{}',    -- e.g. intro, mentoring, hiring, pilot customer
  contact_via text default 'linkedin',
  notes text,
  created_at timestamptz not null default now()
);

create index alumni_campus_idx on public.alumni (campus_id);
create index alumni_domains_idx on public.alumni using gin (domains);
create index alumni_help_idx on public.alumni (open_to_help) where open_to_help;

create table public.competitions (
  id bigint generated always as identity primary key,
  name text not null unique,
  organiser text not null,
  description text not null,
  competition_type text not null default 'competition' check (
    competition_type in ('hackathon', 'competition', 'pitch_event', 'fellowship', 'challenge')
  ),
  domains text[] not null default '{all}',
  eligibility text not null,
  student_only boolean not null default false,
  prize_display text,
  prize_max_inr numeric,
  leads_to text,                      -- incubation, funding, internship, mentorship
  typical_window text,                -- when it usually opens, for recurring events
  application_opens date,
  application_closes date,
  url text,
  source_url text,
  as_of_date text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index competitions_domains_idx on public.competitions using gin (domains);
create index competitions_closes_idx on public.competitions (application_closes);

alter table public.alumni enable row level security;
alter table public.competitions enable row level security;

create policy alumni_read on public.alumni
  for select to authenticated using (true);

create policy alumni_staff_write on public.alumni
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy competitions_read on public.competitions
  for select to anon, authenticated using (true);

create policy competitions_staff_write on public.competitions
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
