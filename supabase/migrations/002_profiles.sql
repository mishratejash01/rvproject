-- Student profiles, auto-provisioned on signup (email, Google or anonymous guest).
-- role escalation is blocked by column-level grants: students can never update `role`.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  campus_id bigint references public.campuses (id),
  branch text,
  year_of_study int check (year_of_study between 1 and 5),
  role text not null default 'student' check (role in ('student', 'admin')),
  is_guest boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_campus_id_idx on public.profiles (campus_id);

-- Admin helper used across policies. SECURITY DEFINER so it can read profiles
-- without recursive RLS evaluation; it only ever reports on the caller.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Column-level protection: the API roles can only touch safe columns.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, campus_id, branch, year_of_study, is_guest)
  on public.profiles to authenticated;

-- Auto-provision a profile row for every new auth user (incl. anonymous guests).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, is_guest)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.is_anonymous, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
