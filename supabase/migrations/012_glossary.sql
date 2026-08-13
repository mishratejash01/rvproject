-- Jargon Defuser: the venture vocabulary rendered as hover tooltips everywhere
-- in the product, and as the full glossary reference page.

create table public.glossary (
  id bigint generated always as identity primary key,
  term text not null unique,
  short_def text not null check (char_length(short_def) <= 200),
  long_def text not null,
  example text,
  category text not null check (
    category in ('fundraising', 'market_sizing', 'metrics', 'product', 'legal_equity', 'gtm', 'vc_speak')
  ),
  related_terms text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index glossary_category_idx on public.glossary (category);

alter table public.glossary enable row level security;

create policy glossary_read on public.glossary
  for select to anon, authenticated using (true);
