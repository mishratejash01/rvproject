-- AI configuration lives in the database, not in code:
--   prompt_templates — every persona/system prompt, model and temperature
--   rubric_criteria  — the scoring weights each module applies
-- prompt_templates has RLS enabled with NO client policies: service-role only.

create table public.prompt_templates (
  key text primary key,
  description text not null,
  system_prompt text not null,
  model text not null default 'gemini-3.5-flash-lite',
  temperature numeric not null default 0.6 check (temperature between 0 and 2),
  max_output_tokens int,
  updated_at timestamptz not null default now()
);

alter table public.prompt_templates enable row level security;
-- no policies: only the service-role key (server) can read prompts.

create table public.rubric_criteria (
  id bigint generated always as identity primary key,
  module text not null check (module in ('validation', 'investibility')),
  key text not null,
  label text not null,
  description text not null,
  weight numeric not null check (weight > 0),
  sort_order int not null default 100,
  unique (module, key)
);

alter table public.rubric_criteria enable row level security;

create policy rubric_read on public.rubric_criteria
  for select to anon, authenticated using (true);
