-- IP and prior-art gate. Search before you build, and record what was found so
-- a novelty claim is traceable rather than asserted.

create table public.prior_art_searches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  search_strategy jsonb not null default '{}'::jsonb,   -- {queries[], cpc_codes[], databases[], keywords[]}
  findings jsonb not null default '[]'::jsonb,          -- [{title, number, assignee, year, url, similarity, note}]
  novelty_verdict text check (novelty_verdict in ('likely_novel', 'crowded', 'blocked', 'inconclusive')),
  novelty_analysis text,
  differentiators jsonb not null default '[]'::jsonb,
  recommended_action text,
  filing_recommendation text check (
    filing_recommendation in ('provisional', 'complete', 'trade_secret', 'defensive_publication', 'not_yet', 'seek_counsel')
  ),
  searched_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  model_used text,
  created_at timestamptz not null default now()
);

create index prior_art_project_idx on public.prior_art_searches (project_id, created_at desc);

-- Institutional IP ownership rules, which students routinely discover too late.
create table public.ip_policies (
  id bigint generated always as identity primary key,
  campus_id bigint references public.campuses (id),
  title text not null,
  summary text not null,
  ownership_rule text not null,
  student_share text,
  requires_disclosure boolean not null default true,
  policy_url text,
  updated_at timestamptz not null default now()
);

alter table public.prior_art_searches enable row level security;
alter table public.ip_policies enable row level security;

create policy prior_art_read on public.prior_art_searches
  for select to authenticated
  using ((select public.owns_project(project_id)) or (select public.is_staff()));

create policy prior_art_write on public.prior_art_searches
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy prior_art_update on public.prior_art_searches
  for update to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)));

create policy ip_policies_read on public.ip_policies
  for select to authenticated using (true);

create policy ip_policies_staff_write on public.ip_policies
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
