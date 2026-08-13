-- Projects: the core entity. UUID PK because ids appear in URLs;
-- share_slug powers public read-only pitch pages.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  problem_statement text not null,
  target_persona text not null,
  technical_approach text not null,
  domain_id bigint not null references public.domains (id),
  status text not null default 'draft'
    check (status in ('draft', 'validated', 'pivoted', 'deck_ready', 'outreach')),
  is_public boolean not null default false,
  share_slug text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  share_views int not null default 0,
  roast_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects (owner_id);
create index projects_domain_id_idx on public.projects (domain_id);
create index projects_public_idx on public.projects (is_public) where is_public;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Shared access helpers, reused by every project-child table's policies.
create or replace function public.owns_project(pid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.projects
    where id = pid and owner_id = (select auth.uid())
  );
$$;

create or replace function public.can_read_project(pid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid
      and (p.owner_id = (select auth.uid()) or p.is_public or (select public.is_admin()))
  );
$$;

alter table public.projects enable row level security;

create policy projects_owner_all on public.projects
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy projects_public_read on public.projects
  for select to anon, authenticated
  using (is_public);

create policy projects_admin_read on public.projects
  for select to authenticated
  using ((select public.is_admin()));
