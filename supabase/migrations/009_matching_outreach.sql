-- Module 5 outputs: ranked investor matches with AI rationale, and the outreach
-- pipeline (drafted → simulated-sent) for emails and LinkedIn DMs.

create table public.investor_matches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  investor_id bigint not null references public.investors (id) on delete cascade,
  fit_score numeric not null check (fit_score between 0 and 100),
  fit_breakdown jsonb not null default '{}'::jsonb, -- {sector,stage,cheque,student_friendly} components
  rationale text,                                    -- AI: why this fund fits this project
  created_at timestamptz not null default now(),
  unique (project_id, investor_id)
);

create index investor_matches_project_idx on public.investor_matches (project_id, fit_score desc);
create index investor_matches_investor_idx on public.investor_matches (investor_id);

create table public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  investor_id bigint not null references public.investors (id) on delete cascade,
  channel text not null check (channel in ('email', 'linkedin')),
  subject text,                    -- null for linkedin DMs
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index outreach_project_idx on public.outreach_drafts (project_id, created_at desc);
create index outreach_investor_idx on public.outreach_drafts (investor_id);

alter table public.investor_matches enable row level security;
alter table public.outreach_drafts enable row level security;

create policy matches_read on public.investor_matches
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy matches_owner_write on public.investor_matches
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy outreach_owner_read on public.outreach_drafts
  for select to authenticated
  using ((select public.owns_project(project_id)));

create policy outreach_owner_write on public.outreach_drafts
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy outreach_owner_update on public.outreach_drafts
  for update to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)));
