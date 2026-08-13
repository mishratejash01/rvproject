-- Module 4 output: versioned 10-slide pitch decks stored as structured JSON.
-- slides: [{key,title,headline,bullets[],speaker_notes,data?}] in YC/Sequoia order.

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version int not null default 1,
  slides jsonb not null,
  narrative_summary text,           -- the one-paragraph story the deck tells
  model_used text,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index decks_project_id_idx on public.decks (project_id, version desc);

alter table public.decks enable row level security;

create policy decks_read on public.decks
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy decks_owner_write on public.decks
  for insert to authenticated
  with check ((select public.owns_project(project_id)));
