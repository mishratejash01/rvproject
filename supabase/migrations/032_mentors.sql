-- Mentor register, assignments and the session record. NBA 6.1.6 counts faculty
-- who mentor student innovation projects, so sessions are logged, not implied.

create table public.mentors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  email text,
  organisation text,
  designation text,
  expertise text[] not null default '{}',      -- skill slugs
  domains text[] not null default '{}',        -- domain slugs
  is_faculty boolean not null default false,
  campus_id bigint references public.campuses (id),
  linkedin_url text,
  bio text,
  capacity int not null default 3 check (capacity between 0 and 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index mentors_expertise_idx on public.mentors using gin (expertise);
create index mentors_domains_idx on public.mentors using gin (domains);
create index mentors_active_idx on public.mentors (is_active) where is_active;

create table public.mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'completed', 'ended')),
  assigned_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (mentor_id, project_id)
);

create index mentor_assignments_project_idx on public.mentor_assignments (project_id);
create index mentor_assignments_mentor_idx on public.mentor_assignments (mentor_id);

create table public.mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.mentor_assignments (id) on delete cascade,
  held_on date not null,
  duration_minutes int not null default 30 check (duration_minutes between 5 and 480),
  topics text not null,
  advice text,
  action_items jsonb not null default '[]'::jsonb,   -- [{item, owner, due_on, done}]
  logged_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index mentor_sessions_assignment_idx on public.mentor_sessions (assignment_id, held_on desc);

alter table public.mentors enable row level security;
alter table public.mentor_assignments enable row level security;
alter table public.mentor_sessions enable row level security;

create policy mentors_read on public.mentors
  for select to authenticated using (true);

create policy mentors_staff_write on public.mentors
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy mentor_assignments_read on public.mentor_assignments
  for select to authenticated
  using ((select public.owns_project(project_id))
         or (select public.is_staff())
         or mentor_id in (select id from public.mentors where user_id = (select auth.uid())));

create policy mentor_assignments_staff_write on public.mentor_assignments
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy mentor_sessions_read on public.mentor_sessions
  for select to authenticated
  using (assignment_id in (
    select a.id from public.mentor_assignments a
    where (select public.owns_project(a.project_id))
       or (select public.is_staff())
       or a.mentor_id in (select id from public.mentors where user_id = (select auth.uid()))
  ));

create policy mentor_sessions_write on public.mentor_sessions
  for insert to authenticated
  with check (assignment_id in (
    select a.id from public.mentor_assignments a
    where (select public.owns_project(a.project_id))
       or (select public.is_staff())
       or a.mentor_id in (select id from public.mentors where user_id = (select auth.uid()))
  ));
