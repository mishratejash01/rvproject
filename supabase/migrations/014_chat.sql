-- War Room conversations: Roast mode and the simulated Investment Committee.
-- gemini_interaction_id chains server-side model state across turns.

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode text not null check (mode in ('roast', 'ic_panel')),
  gemini_interaction_id text,
  verdict jsonb,                     -- closing verdict when the session is ended
  created_at timestamptz not null default now()
);

create index chat_sessions_project_idx on public.chat_sessions (project_id, created_at desc);
create index chat_sessions_user_idx on public.chat_sessions (user_id);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  persona text,                      -- e.g. "Growth Partner", "Deeptech GP" on the IC panel
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_session_idx on public.chat_messages (session_id, id);

create or replace function public.owns_chat_session(sid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.chat_sessions
    where id = sid and user_id = (select auth.uid())
  );
$$;

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create policy chat_sessions_owner on public.chat_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy chat_messages_owner_read on public.chat_messages
  for select to authenticated
  using ((select public.owns_chat_session(session_id)));

create policy chat_messages_owner_write on public.chat_messages
  for insert to authenticated
  with check ((select public.owns_chat_session(session_id)));
