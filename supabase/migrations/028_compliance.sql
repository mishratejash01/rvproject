-- Accreditation capture. Every field here exists because a specific NBA, NAAC
-- AQAR or MoE IIC return demands it:
--   NBA 4.6      student entrepreneurs count 1:1 with placements (30 marks)
--   NBA 9.5      e-cell activities and students taking up entrepreneurship
--   NBA 6.2.3    patents granted / published / working prototypes
--   NAAC AQAR 3.3.1  IPR and entrepreneurship workshops (title, dept, dates)
--   NAAC AQAR 3.3.3  start-ups by name, nature and date of commencement
--   NAAC AQAR 3.4.4  patents by status, number and date
--   MoE IIC      minimum three calendar activities per quarter

create table public.institution_activities (
  id uuid primary key default gen_random_uuid(),
  campus_id bigint references public.campuses (id),
  title text not null,
  activity_type text not null check (
    activity_type in ('workshop', 'seminar', 'bootcamp', 'hackathon', 'ideathon',
                      'mentoring_session', 'field_visit', 'expert_talk', 'competition', 'other')
  ),
  theme text not null check (
    theme in ('ipr', 'entrepreneurship', 'innovation', 'research_methodology', 'skill_development', 'design_thinking')
  ),
  department text,
  starts_on date not null,
  ends_on date,
  participants int not null default 0 check (participants >= 0),
  faculty_involved int not null default 0 check (faculty_involved >= 0),
  report_url text,
  is_iic_calendar_activity boolean not null default false,
  academic_year text not null,          -- e.g. "2026-27"
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index institution_activities_year_idx on public.institution_activities (academic_year, starts_on);
create index institution_activities_theme_idx on public.institution_activities (theme);

create table public.patents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  campus_id bigint references public.campuses (id),
  title text not null,
  inventors text[] not null default '{}',
  application_number text,
  patent_number text,
  status text not null default 'draft' check (
    status in ('draft', 'provisional_filed', 'complete_filed', 'published', 'granted', 'abandoned')
  ),
  filed_on date,
  published_on date,
  granted_on date,
  jurisdiction text not null default 'IN',
  is_prototype_only boolean not null default false,   -- feeds the NBA 6.2.3 prototype count
  academic_year text,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index patents_status_idx on public.patents (status);
create index patents_year_idx on public.patents (academic_year);
create index patents_project_idx on public.patents (project_id);

-- A registered company started by a student. This is the NBA 4.6 "Z" term and
-- the AQAR 3.3.3 row, so the fields mirror those returns exactly.
create table public.student_ventures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  founder_id uuid references auth.users (id) on delete set null,
  campus_id bigint references public.campuses (id),
  legal_name text not null,
  nature_of_startup text not null,
  entity_type text not null default 'private_limited' check (
    entity_type in ('private_limited', 'llp', 'opc', 'partnership', 'proprietorship', 'section_8', 'unregistered')
  ),
  cin text,
  date_of_commencement date not null,
  dpiit_number text,
  dpiit_recognised_on date,
  is_incubated_on_campus boolean not null default false,
  graduating_batch_year int,          -- ties the founder to an NBA batch
  programme text,
  is_operating boolean not null default true,
  website text,
  academic_year text,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index student_ventures_batch_idx on public.student_ventures (graduating_batch_year);
create index student_ventures_campus_idx on public.student_ventures (campus_id);

-- Placement-cell figures that the entrepreneurship count is measured against.
create table public.accreditation_batches (
  id bigint generated always as identity primary key,
  campus_id bigint not null references public.campuses (id),
  programme text not null,
  graduating_year int not null,
  sanctioned_intake int not null default 0,
  lateral_entry int not null default 0,
  final_year_students int not null default 0,
  students_placed int not null default 0,
  students_higher_studies int not null default 0,
  -- Entrepreneurship is counted from student_ventures, never typed in by hand.
  notes text,
  updated_at timestamptz not null default now(),
  unique (campus_id, programme, graduating_year)
);

alter table public.institution_activities enable row level security;
alter table public.patents enable row level security;
alter table public.student_ventures enable row level security;
alter table public.accreditation_batches enable row level security;

create policy activities_read on public.institution_activities
  for select to authenticated using (true);

create policy activities_staff_write on public.institution_activities
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy patents_read on public.patents
  for select to authenticated
  using (created_by = (select auth.uid())
         or (project_id is not null and (select public.can_read_project(project_id)))
         or (select public.is_staff()));

create policy patents_owner_write on public.patents
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy patents_owner_update on public.patents
  for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_staff()))
  with check (created_by = (select auth.uid()) or (select public.is_staff()));

create policy ventures_read on public.student_ventures
  for select to authenticated
  using (founder_id = (select auth.uid()) or (select public.is_staff()));

create policy ventures_owner_write on public.student_ventures
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy ventures_update on public.student_ventures
  for update to authenticated
  using (founder_id = (select auth.uid()) or (select public.is_staff()))
  with check (founder_id = (select auth.uid()) or (select public.is_staff()));

create policy batches_staff_all on public.accreditation_batches
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
