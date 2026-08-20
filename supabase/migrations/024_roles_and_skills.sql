-- Widen the role vocabulary so faculty and external mentors are first-class,
-- and add the skills taxonomy that co-founder matching and team gaps rely on.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'faculty', 'mentor', 'admin'));

-- Faculty and admins both need elevated read access across the institution.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('faculty', 'admin')
  );
$$;

create table public.skills (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  category text not null check (
    category in ('engineering', 'data_ai', 'hardware', 'design', 'business', 'domain')
  ),
  sort_order int not null default 100
);

create index skills_category_idx on public.skills (category);

alter table public.skills enable row level security;

create policy skills_read on public.skills
  for select to anon, authenticated using (true);
